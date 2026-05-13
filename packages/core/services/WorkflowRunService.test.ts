import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkflowRun, WorkflowRunEvent } from '../dto';
import type { WorkflowRunRepository } from '../repositories/WorkflowRunRepository';
import { WorkflowRunService } from './WorkflowRunService';

describe('WorkflowRunService', () => {
    let repository: WorkflowRunRepository;
    let service: WorkflowRunService;

    beforeEach(() => {
        repository = {
            create: vi.fn(),
            getById: vi.fn(),
            getByWorkflowId: vi.fn(),
            updateStatus: vi.fn(),
            addEvent: vi.fn(),
        } as unknown as WorkflowRunRepository;
        service = new WorkflowRunService(repository);
    });

    it('starts a run and records created event', async () => {
        const run = { id: 'r1', status: 'queued' } as WorkflowRun;
        (repository.create as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(run);

        const result = await service.startRun({ workflowId: 'w1', workflowVersionId: 'v1' } as unknown as WorkflowRun);

        expect(result).toEqual(run);
        expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ status: 'queued' }));
        expect(repository.addEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'created' }));
    });

    it('updates run status, supports cancel, and fetches status timeline', async () => {
        const run = { id: 'r1', status: 'running' } as WorkflowRun;
        const timeline = { ...run, events: [] as WorkflowRunEvent[] };
        (repository.updateStatus as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(run);
        (repository.getById as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(timeline);

        await expect(service.updateRunStatus('r1', 'running', 'started')).resolves.toEqual(run);
        await expect(service.cancelRun('r1')).resolves.toEqual(run);
        await expect(service.getRunStatus('r1')).resolves.toEqual(timeline);

        expect(repository.addEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'started' }));
        expect(repository.addEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'canceled' }));
    });

    it('maps queued status updates to created events', async () => {
        const run = { id: 'r2', status: 'queued' } as WorkflowRun;
        (repository.updateStatus as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(run);

        await expect(service.updateRunStatus('r2', 'queued', 're-queued')).resolves.toEqual(run);

        expect(repository.addEvent).toHaveBeenCalledWith(expect.objectContaining({
            workflowRunId: 'r2',
            eventType: 'created',
            status: 'queued',
        }));
    });

    it('records waiting approval and progress events', async () => {
        const run = { id: 'r3', status: 'waiting_approval' } as WorkflowRun;
        const event = { id: 'e1', workflowRunId: 'r3', eventType: 'progress' } as WorkflowRunEvent;
        (repository.updateStatus as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(run);
        (repository.addEvent as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(event);

        await expect(service.updateRunStatus('r3', 'waiting_approval', 'approval needed')).resolves.toEqual(run);
        await expect(service.recordProgressEvent('r3', 'step started', { nodeId: 'n1' })).resolves.toEqual(event);

        expect(repository.addEvent).toHaveBeenCalledWith(expect.objectContaining({
            eventType: 'waiting_approval',
            status: 'waiting_approval',
        }));
        expect(repository.addEvent).toHaveBeenCalledWith(expect.objectContaining({
            eventType: 'progress',
            status: 'running',
            payload: { nodeId: 'n1' },
        }));
    });
});
