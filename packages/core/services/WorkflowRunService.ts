import { inject, injectable } from 'inversify';
import { WorkflowRun, WorkflowRunEvent, WorkflowRunEventInsert, WorkflowRunInsert } from '../dto';
import { WorkflowRunRepository } from '../repositories/WorkflowRunRepository';
import { CORETYPES } from '../types/types';

@injectable()
export class WorkflowRunService {
    constructor(@inject(CORETYPES.WorkflowRunRepository) private workflowRunRepository: WorkflowRunRepository) {}

    // Starts a workflow run and writes initial lifecycle events.
    public async startRun(input: WorkflowRunInsert): Promise<WorkflowRun> {
        const run = await this.workflowRunRepository.create({ ...input, status: 'queued' });
        await this.workflowRunRepository.addEvent({
            workflowRunId: run.id,
            eventType: 'created',
            status: 'queued',
            message: 'Run created',
        });
        return run;
    }

    // Updates run status and mirrors it in the event timeline.
    public async updateRunStatus(
        runId: string,
        status: WorkflowRun['status'],
        message?: string,
    ): Promise<WorkflowRun | undefined> {
        const run = await this.workflowRunRepository.updateStatus(runId, status, status === 'failed' ? message : null);
        if (!run) return undefined;

        await this.workflowRunRepository.addEvent({
            workflowRunId: runId,
            eventType: this.mapStatusToEventType(status),
            status: status,
            message: message ?? `Run status updated to ${status}`,
        });
        return run;
    }

    // Records detailed execution events without forcing a run-level status change.
    public async recordRunEvent(input: WorkflowRunEventInsert): Promise<WorkflowRunEvent> {
        return this.workflowRunRepository.addEvent(input);
    }

    // Captures per-step progress with a consistent event type for stream consumers and audit views.
    public async recordProgressEvent(
        runId: string,
        message: string,
        payload?: Record<string, unknown>,
        status: WorkflowRun['status'] = 'running',
    ): Promise<WorkflowRunEvent> {
        return this.recordRunEvent({
            workflowRunId: runId,
            eventType: 'progress',
            status: status,
            message: message,
            payload: payload,
        });
    }

    // Cancels an active run and records the cancellation event.
    public async cancelRun(runId: string, message?: string): Promise<WorkflowRun | undefined> {
        return this.updateRunStatus(runId, 'cancelled', message ?? 'Run cancelled');
    }

    // Retrieves the latest status plus event timeline for a run.
    public async getRunStatus(runId: string): Promise<(WorkflowRun & { events: WorkflowRunEvent[] }) | undefined> {
        return this.workflowRunRepository.getById(runId);
    }

    // Keeps run status values aligned with the constrained event enum values.
    private mapStatusToEventType(status: WorkflowRun['status']): WorkflowRunEvent['eventType'] {
        if (status === 'queued') {
            return 'created';
        }
        if (status === 'running') {
            return 'started';
        }
        if (status === 'waiting_approval') {
            return 'waiting_approval';
        }
        return status;
    }
}
