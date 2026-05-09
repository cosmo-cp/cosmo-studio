import { inject, injectable } from 'inversify';
import { WorkflowRun, WorkflowRunEvent, WorkflowRunInsert } from '../dto';
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
    public async updateRunStatus(runId: string, status: WorkflowRun['status'], message?: string): Promise<WorkflowRun | undefined> {
        const run = await this.workflowRunRepository.updateStatus(runId, status, status === 'failed' ? message : null);
        if (!run) return undefined;
        await this.workflowRunRepository.addEvent({
            workflowRunId: runId,
            eventType: status === 'running' ? 'started' : status,
            status,
            message: message ?? `Run status updated to ${status}`,
        });
        return run;
    }

    // Cancels an active run and records the cancellation event.
    public async cancelRun(runId: string, message?: string): Promise<WorkflowRun | undefined> {
        return this.updateRunStatus(runId, 'cancelled', message ?? 'Run cancelled');
    }

    // Retrieves the latest status plus event timeline for a run.
    public async getRunStatus(runId: string): Promise<(WorkflowRun & { events: WorkflowRunEvent[] }) | undefined> {
        return this.workflowRunRepository.getById(runId);
    }
}
