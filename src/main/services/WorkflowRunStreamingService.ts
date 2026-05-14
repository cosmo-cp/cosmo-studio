import {inject, injectable} from 'inversify';
import {CORETYPES} from 'core/types/types';
import {WorkflowRunService} from 'core/services/WorkflowRunService';
import {WorkflowRunEvent, WorkflowRunStreamEventEnvelope} from 'core/dto';

@injectable()
export class WorkflowRunStreamingService {
    constructor(@inject(CORETYPES.WorkflowRunService) private readonly workflowRunService: WorkflowRunService) {}

    // Stream workflow run event envelopes by polling run status until completion or abort.
    public async *streamRunEvents(runId: string, signal: AbortSignal, afterSequence = 0): AsyncGenerator<WorkflowRunStreamEventEnvelope> {
        let sequence = afterSequence;
        while (!signal.aborted) {
            const run = await this.workflowRunService.getRunStatus(runId);
            if (!run) {
                return;
            }

            const events = [...run.events].reverse();
            for (const event of events.slice(sequence)) {
                sequence += 1;
                yield this.toEnvelope(runId, event, sequence);
            }

            if (run.status === 'completed' || run.status === 'failed' || run.status === 'cancelled') {
                if (!events.some((event) => event.eventType === 'completed' || event.eventType === 'failed' || event.eventType === 'cancelled')) {
                    sequence += 1;
                    yield {
                        runId,
                        type: run.status === 'completed' ? 'finished' : 'error',
                        timestamp: new Date().toISOString(),
                        sequence,
                        message: run.errorMessage ?? `Run ${run.status}`,
                    };
                }
                return;
            }

            await new Promise((resolve) => setTimeout(resolve, 500));
        }
    }

    private toEnvelope(runId: string, event: WorkflowRunEvent, sequence: number): WorkflowRunStreamEventEnvelope {
        const typeMap: Record<WorkflowRunEvent['eventType'], WorkflowRunStreamEventEnvelope['type']> = {
            created: 'step.started',
            started: 'step.started',
            progress: 'tool.call',
            completed: 'step.completed',
            failed: 'error',
            cancelled: 'finished',
        };

        return {
            runId,
            type: typeMap[event.eventType],
            timestamp: event.createdAt.toISOString(),
            sequence,
            payload: (event.payload as Record<string, unknown> | null) ?? undefined,
            message: event.message ?? undefined,
        };
    }
}
