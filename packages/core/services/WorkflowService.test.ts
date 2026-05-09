import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Workflow, WorkflowGraph, WorkflowVersion } from '../dto';
import type { WorkflowRepository } from '../repositories/WorkflowRepository';
import { WorkflowService } from './WorkflowService';

describe('WorkflowService', () => {
    let repository: WorkflowRepository;
    let service: WorkflowService;

    beforeEach(() => {
        repository = {
            getAll: vi.fn(),
            getById: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
            getVersionsForWorkflow: vi.fn(),
            createVersion: vi.fn(),
        } as unknown as WorkflowRepository;
        service = new WorkflowService(repository);
    });

    it('delegates CRUD/search and versioning operations', async () => {
        const workflow = { id: 'w1' } as Workflow;
        const version = { id: 'v1' } as WorkflowVersion;
        const graph = { nodes: [], edges: [] } as WorkflowGraph;

        (repository.getAll as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([workflow]);
        (repository.getById as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(workflow);
        (repository.create as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(workflow);
        (repository.update as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(workflow);
        (repository.getVersionsForWorkflow as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([version]);
        (repository.createVersion as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(version);

        await expect(service.getAllWorkflows('abc')).resolves.toEqual([workflow]);
        await expect(service.getWorkflowById('w1')).resolves.toEqual(workflow);
        await expect(service.createWorkflow({ title: 'T', summary: 'S' }, graph)).resolves.toEqual(workflow);
        await expect(service.updateWorkflow('w1', { title: 'T2' })).resolves.toEqual(workflow);
        await service.deleteWorkflow('w1');
        await expect(service.getWorkflowVersions('w1')).resolves.toEqual([version]);
        await expect(service.createWorkflowVersion('w1', graph)).resolves.toEqual(version);

        expect(repository.delete).toHaveBeenCalledWith('w1');
    });
});
