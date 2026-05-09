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
        expect(repository.addEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'cancelled' }));
    });
});
