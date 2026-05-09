import { inject, injectable } from 'inversify';
import { z } from 'zod';
import { IpcController, IpcHandler } from '../ipc/Decorators';
import { CORETYPES } from 'core/types/types';
import { WorkflowService } from 'core/services/WorkflowService';
import { WorkflowRunService } from 'core/services/WorkflowRunService';
import type { Workflow, WorkflowCreateInput, WorkflowGraph, WorkflowRun, WorkflowRunInsert, WorkflowRunStatus, WorkflowVersion } from 'core/dto';
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
    workflowVersionId: z.string().uuid(),
    status: z.enum(['queued', 'running', 'completed', 'failed', 'cancelled']).optional(),
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

@injectable()
@IpcController('workflow')
export class WorkflowController implements Controller {
    constructor(
        @inject(CORETYPES.WorkflowService)
        private workflowService: WorkflowService,
        @inject(CORETYPES.WorkflowRunService)
        private workflowRunService: WorkflowRunService,
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
        return this.workflowRunService.startRun(workflowRunStartSchema.parse(input));
    }

    // Cancel an existing workflow run and record the cancellation event.
    @IpcHandler('run.cancel', z.tuple([workflowRunCancelSchema]))
    public async runCancel(input: { runId: string; message?: string }): Promise<WorkflowRun | undefined> {
        const parsed = workflowRunCancelSchema.parse(input);
        return this.workflowRunService.cancelRun(parsed.runId, parsed.message);
    }

    // Fetch the current run status with timeline events for monitoring views.
    @IpcHandler('run.get', z.tuple([workflowRunGetSchema]))
    public async runGet(input: { runId: string }): Promise<WorkflowRunStatus | undefined> {
        const parsed = workflowRunGetSchema.parse(input);
        return this.workflowRunService.getRunStatus(parsed.runId);
    }
}
