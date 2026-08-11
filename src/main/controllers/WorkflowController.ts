import type {
    Workflow,
    WorkflowCreateInput,
    WorkflowGraph,
    WorkflowRun,
    WorkflowRunInsert,
    WorkflowRunStatus,
    WorkflowRunStreamAbortArgs,
    WorkflowRunStreamStartArgs,
    WorkflowVersion,
} from 'core/dto';
import { WorkflowRunService } from 'core/services/WorkflowRunService';
import { WorkflowService } from 'core/services/WorkflowService';
import { CORETYPES } from 'core/types/types';
import type { IpcMainEvent, WebContents } from 'electron';
import { inject, injectable } from 'inversify';
import { z } from 'zod';
import { IpcController, IpcHandler, IpcOn, IpcRendererOn } from '../ipc/Decorators';
import { logger } from '../logger';
import { WorkflowExecutionService } from '../services/WorkflowExecutionService';
import { WorkflowRunStreamingService } from '../services/WorkflowRunStreamingService';
import { TYPES } from '../types';
import { Controller } from './Controller';

const workflowGraphSchema = z.strictObject({
    nodes: z.array(z.record(z.string(), z.unknown())),
    edges: z.array(z.record(z.string(), z.unknown())),
    config: z.record(z.string(), z.unknown()).optional(),
});

const workflowCreateSchema = z.strictObject({
    title: z.string().min(1),
    summary: z.string().nullable(),
});

const workflowUpdateSchema = z.strictObject({
    title: z.string().min(1).optional(),
    summary: z.string().nullable().optional(),
});

const workflowRunStartSchema = z.strictObject({
    workflowId: z.string().uuid(),
    workflowVersionId: z.string().uuid().optional(),
    status: z.enum(['queued', 'running', 'waiting_approval', 'completed', 'failed', 'cancelled']).optional(),
    startedAt: z.date().nullable().optional(),
    completedAt: z.date().nullable().optional(),
    errorMessage: z.string().nullable().optional(),
});

const workflowRunCancelSchema = z.strictObject({
    runId: z.string().uuid(),
    message: z.string().min(1).optional(),
});

const workflowRunGetSchema = z.strictObject({
    runId: z.string().uuid(),
});

const workflowRunStreamStartSchema = z.strictObject({
    runId: z.string().uuid(),
    streamChannel: z.string().min(1),
    afterSequence: z.number().int().min(0).optional(),
});

const workflowRunStreamAbortSchema = z.strictObject({
    streamChannel: z.string().min(1),
});

@injectable()
@IpcController('workflow')
export class WorkflowController implements Controller {
    private readonly activeRunStreams = new Map<string, AbortController>();

    constructor(
        @inject(CORETYPES.WorkflowService)
        private workflowService: WorkflowService,
        @inject(CORETYPES.WorkflowRunService)
        private workflowRunService: WorkflowRunService,
        @inject(TYPES.WorkflowRunStreamingService)
        private workflowRunStreamingService: WorkflowRunStreamingService,
        @inject(TYPES.WorkflowExecutionService)
        private workflowExecutionService: WorkflowExecutionService,
    ) {}

    // List workflows for the workflow history UI with optional search filtering.
    @IpcHandler('list', z.tuple([z.string().nullable()]))
    public async list(searchQuery: string | null): Promise<Workflow[]> {
        return this.workflowService.getAllWorkflows(searchQuery);
    }

    // Fetch a single workflow by id for canvas loading and editing operations.
    @IpcHandler('get', z.tuple([z.string().uuid()]))
    public async get(id: string): Promise<Workflow | undefined> {
        return this.workflowService.getWorkflowById(id);
    }

    // Create a workflow and its initial graph snapshot version in one operation.
    @IpcHandler('create', z.tuple([workflowCreateSchema, workflowGraphSchema]))
    public async create(input: WorkflowCreateInput, graph: WorkflowGraph): Promise<Workflow> {
        return this.workflowService.createWorkflow(workflowCreateSchema.parse(input), workflowGraphSchema.parse(graph));
    }

    // Update mutable workflow metadata fields while keeping version history immutable.
    @IpcHandler('update', z.tuple([z.string().uuid(), workflowUpdateSchema]))
    public async update(id: string, updates: Partial<WorkflowCreateInput>): Promise<Workflow | undefined> {
        return this.workflowService.updateWorkflow(id, workflowUpdateSchema.parse(updates));
    }

    // Delete a workflow and all dependent versions/runs through repository cascades.
    @IpcHandler('delete', z.tuple([z.string().uuid()]))
    public async delete(id: string): Promise<void> {
        await this.workflowService.deleteWorkflow(id);
    }

    // Persist a new immutable workflow graph version from the latest canvas state.
    @IpcHandler('saveGraph', z.tuple([z.string().uuid(), workflowGraphSchema]))
    public async saveGraph(id: string, graph: WorkflowGraph): Promise<WorkflowVersion> {
        return this.workflowService.createWorkflowVersion(id, workflowGraphSchema.parse(graph));
    }

    // Start a workflow run and emit the initial queued lifecycle record.
    @IpcHandler('run.start', z.tuple([workflowRunStartSchema]))
    public async runStart(input: WorkflowRunInsert): Promise<WorkflowRun> {
        const parsedInput = workflowRunStartSchema.parse(input);
        const versions = await this.workflowService.getWorkflowVersions(parsedInput.workflowId);
        const version = parsedInput.workflowVersionId
            ? versions.find((workflowVersion) => {
                  return workflowVersion.id === parsedInput.workflowVersionId;
              })
            : versions[0];

        if (!version) {
            throw new Error('Cannot start workflow run without an available workflow version');
        }

        const runInput = { ...parsedInput, workflowVersionId: version.id };
        const run = await this.workflowRunService.startRun(runInput);
        void this.workflowExecutionService.executeRun({
            runId: run.id,
            graph: version.graph as WorkflowGraph,
        });
        return run;
    }

    // Cancel an existing workflow run and record the cancellation event.
    @IpcHandler('run.cancel', z.tuple([workflowRunCancelSchema]))
    public async runCancel(input: { runId: string; message?: string }): Promise<WorkflowRun | undefined> {
        const parsed = workflowRunCancelSchema.parse(input);
        return this.workflowExecutionService.cancelRun(parsed.runId, parsed.message);
    }

    // Fetch the current run status with timeline events for monitoring views.
    @IpcHandler('run.get', z.tuple([workflowRunGetSchema]))
    public async runGet(input: { runId: string }): Promise<WorkflowRunStatus | undefined> {
        const parsed = workflowRunGetSchema.parse(input);
        return this.workflowRunService.getRunStatus(parsed.runId);
    }

    // Starts a run event stream for Electron renderers using the persisted event timeline.
    @IpcOn('run.stream.start', z.tuple([workflowRunStreamStartSchema]))
    public async runStreamStart(input: WorkflowRunStreamStartArgs, event: IpcMainEvent): Promise<void> {
        const args = workflowRunStreamStartSchema.parse(input);
        const webContents = event.sender as WebContents;
        const controller = new AbortController();
        this.activeRunStreams.set(args.streamChannel, controller);

        try {
            for await (const envelope of this.workflowRunStreamingService.streamRunEvents(
                args.runId,
                controller.signal,
                args.afterSequence ?? 0,
            )) {
                if (webContents.isDestroyed()) {
                    controller.abort();
                    break;
                }
                webContents.send(`${args.streamChannel}-data`, envelope);
            }
            this.activeRunStreams.delete(args.streamChannel);
            if (!webContents.isDestroyed()) {
                webContents.send(`${args.streamChannel}-end`);
            }
        } catch (error) {
            logger.error('Failed to stream workflow run events:', error);
            controller.abort();
            this.activeRunStreams.delete(args.streamChannel);
            if (!webContents.isDestroyed()) {
                webContents.send(`${args.streamChannel}-error`, error);
            }
        }
    }

    // Stops an active run event stream when the renderer view is closed or replaced.
    @IpcOn('run.stream.abort', z.tuple([workflowRunStreamAbortSchema]))
    public runStreamAbort(input: WorkflowRunStreamAbortArgs): void {
        const args = workflowRunStreamAbortSchema.parse(input);
        const controller = this.activeRunStreams.get(args.streamChannel);
        if (!controller) {
            return;
        }
        controller.abort();
        this.activeRunStreams.delete(args.streamChannel);
    }

    // Documents the renderer event channel shape for generated preload API consumers.
    @IpcRendererOn('run-stream-data')
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public onRunStreamData(channel: string, listener: (data: unknown) => void): () => void {
        return () => {};
    }

    // Documents the renderer stream completion channel for generated preload API consumers.
    @IpcRendererOn('run-stream-end')
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public onRunStreamEnd(channel: string, listener: () => void): () => void {
        return () => {};
    }

    // Documents the renderer stream error channel for generated preload API consumers.
    @IpcRendererOn('run-stream-error')
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public onRunStreamError(channel: string, listener: (error: unknown) => void): () => void {
        return () => {};
    }
}
