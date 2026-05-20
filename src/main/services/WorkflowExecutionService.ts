import { inject, injectable } from 'inversify';
import { sleep } from '@workflow/core';
import { WorkflowRunService } from 'core/services/WorkflowRunService';
import { CORETYPES } from 'core/types/types';
import type { WorkflowGraph, WorkflowRun } from 'core/dto';
import { logger } from '../logger';

export interface WorkflowExecutionOptions {
    runId: string;
    graph: WorkflowGraph;
}

@injectable()
export class WorkflowExecutionService {
    constructor(
        @inject(CORETYPES.WorkflowRunService)
        private workflowRunService: WorkflowRunService,
    ) {}

    // Runs a durable workflow starter sequence and records lifecycle transitions.
    public async executeRun(input: WorkflowExecutionOptions | WorkflowRun): Promise<void> {
        const runId = 'runId' in input ? input.runId : input.id;

        try {
            await this.workflowRunService.updateRunStatus(runId, 'running', 'Workflow execution started');

            // Uses the Vercel Workflow SDK primitive so execution can become resumable/durable as steps are added.
            await sleep('workflow-initialization', 1);

            await this.workflowRunService.updateRunStatus(runId, 'completed', 'Workflow execution completed');
        } catch (error) {
            logger.error('Workflow execution failed', {runId, error});
            await this.workflowRunService.updateRunStatus(runId, 'failed', 'Workflow execution failed');
        }
    }
}
