import type { WorkflowGraph, WorkflowRun, WorkflowRunInsert, WorkflowVersion } from 'core/dto';
import type { WorkflowRunService } from 'core/services/WorkflowRunService';
import type { WorkflowService } from 'core/services/WorkflowService';
import { describe, expect, it, vi } from 'vitest';
import type { WorkflowExecutionService } from '../services/WorkflowExecutionService';
import type { WorkflowRunStreamingService } from '../services/WorkflowRunStreamingService';
import { WorkflowController } from './WorkflowController';

describe('WorkflowController', () => {
    it('starts a run with the persisted workflow version graph', async () => {
        const workflowId = '11111111-1111-4111-8111-111111111111';
        const workflowVersionId = '22222222-2222-4222-8222-222222222222';
        const graph: WorkflowGraph = {
            nodes: [
                {
                    id: 'start',
                    data: {
                        templateId: 'start',
                    },
                },
            ],
            edges: [],
        };
        const run = {
            id: '33333333-3333-4333-8333-333333333333',
            workflowId: workflowId,
            workflowVersionId: workflowVersionId,
            status: 'queued',
        } as WorkflowRun;
        const workflowService = {
            getWorkflowVersions: vi.fn().mockResolvedValue([
                {
                    id: workflowVersionId,
                    graph: graph,
                } as WorkflowVersion,
            ]),
        } as unknown as WorkflowService;
        const workflowRunService = {
            startRun: vi.fn().mockResolvedValue(run),
        } as unknown as WorkflowRunService;
        const workflowRunStreamingService = {} as WorkflowRunStreamingService;
        const workflowExecutionService = {
            executeRun: vi.fn().mockResolvedValue({
                status: 'completed',
                visitedNodeIds: [],
                outputs: {},
            }),
        } as unknown as WorkflowExecutionService;
        const controller = new WorkflowController(
            workflowService,
            workflowRunService,
            workflowRunStreamingService,
            workflowExecutionService,
        );
        const input = {
            workflowId: workflowId,
            workflowVersionId: workflowVersionId,
        } as WorkflowRunInsert;

        await expect(controller.runStart(input)).resolves.toEqual(run);

        expect(workflowRunService.startRun).toHaveBeenCalledWith(input);
        expect(workflowService.getWorkflowVersions).toHaveBeenCalledWith(workflowId);
        expect(workflowExecutionService.executeRun).toHaveBeenCalledWith({
            runId: run.id,
            graph: graph,
        });
    });

    it('cancels runs through the execution service so active executions abort', async () => {
        const runId = '44444444-4444-4444-8444-444444444444';
        const cancelledRun = {
            id: runId,
            status: 'cancelled',
        } as WorkflowRun;
        const workflowService = {} as WorkflowService;
        const workflowRunService = {} as WorkflowRunService;
        const workflowRunStreamingService = {} as WorkflowRunStreamingService;
        const workflowExecutionService = {
            cancelRun: vi.fn().mockResolvedValue(cancelledRun),
        } as unknown as WorkflowExecutionService;
        const controller = new WorkflowController(
            workflowService,
            workflowRunService,
            workflowRunStreamingService,
            workflowExecutionService,
        );

        await expect(controller.runCancel({ runId: runId, message: 'Stop' })).resolves.toEqual(cancelledRun);

        expect(workflowExecutionService.cancelRun).toHaveBeenCalledWith(runId, 'Stop');
    });
});
