import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Task, TaskCreateInput } from '../../dto';
import type { TaskRepository } from '../../repositories/TaskRepository';
import { TaskService } from '../TaskService';

describe('TaskService', () => {
    let service: TaskService;
    let mockRepo: Record<keyof TaskRepository, ReturnType<typeof vi.fn>>;

    const sampleTask: Task = {
        id: '11111111-1111-1111-1111-111111111111',
        title: 'Sample Task',
        description: 'Sample Description',
        status: 'not_started',
        workspacePath: '/path/to/workspace',
        runtime: 'model',
        provider: 'anthropic',
        modelId: 'claude-3-7-sonnet',
        agentId: null,
        nextTaskId: null,
        closedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    beforeEach(() => {
        mockRepo = {
            list: vi.fn(),
            getById: vi.fn(),
            getWithLinks: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            close: vi.fn(),
            updateStatus: vi.fn(),
            listByStatus: vi.fn(),
        };
        service = new TaskService(mockRepo as unknown as TaskRepository);
    });

    describe('create', () => {
        it('validates and creates a task with defaults', async () => {
            const input: TaskCreateInput = {
                title: '  New Task  ',
                description: 'Task details',
                workspacePath: '  /my/repo  ',
            };
            mockRepo.create.mockResolvedValue({
                ...sampleTask,
                title: 'New Task',
                workspacePath: '/my/repo',
            });

            const result = await service.create(input);
            expect(result.title).toBe('New Task');
            expect(mockRepo.create).toHaveBeenCalledWith({
                ...input,
                title: 'New Task',
                workspacePath: '/my/repo',
                status: 'not_started',
                runtime: 'model',
            });
        });

        it('throws if title is missing or empty', async () => {
            await expect(service.create({ title: '   ', description: 'desc', workspacePath: '/ws' })).rejects.toThrow(
                'Title is required.',
            );
        });

        it('throws if workspacePath is missing or empty', async () => {
            await expect(service.create({ title: 'Title', description: 'desc', workspacePath: '' })).rejects.toThrow(
                'Workspace path is required.',
            );
        });
    });

    describe('update', () => {
        it('throws if task does not exist', async () => {
            mockRepo.getById.mockResolvedValue(undefined);
            await expect(service.update('non-existent', { title: 'New' })).rejects.toThrow(
                'Task non-existent does not exist.',
            );
        });

        it('throws if task is in_progress and workspacePath is modified', async () => {
            mockRepo.getById.mockResolvedValue({
                ...sampleTask,
                status: 'in_progress',
                workspacePath: '/original/path',
            });

            await expect(service.update(sampleTask.id, { workspacePath: '/new/path' })).rejects.toThrow(
                'Cannot change workspace path while task is actively running. Cancel the task first.',
            );
        });

        it('allows updating other fields when task is in_progress', async () => {
            mockRepo.getById.mockResolvedValue({
                ...sampleTask,
                status: 'in_progress',
                workspacePath: '/original/path',
            });
            mockRepo.update.mockResolvedValue({
                ...sampleTask,
                status: 'in_progress',
                description: 'Updated while running',
            });

            const res = await service.update(sampleTask.id, { description: 'Updated while running' });
            expect(res.description).toBe('Updated while running');
            expect(mockRepo.update).toHaveBeenCalled();
        });

        it('rejects empty title or workspacePath in update', async () => {
            mockRepo.getById.mockResolvedValue(sampleTask);

            await expect(service.update(sampleTask.id, { title: '   ' })).rejects.toThrow('Title is required.');

            await expect(service.update(sampleTask.id, { workspacePath: '   ' })).rejects.toThrow(
                'Workspace path is required.',
            );
        });

        it('sanitizes and updates valid fields', async () => {
            mockRepo.getById.mockResolvedValue(sampleTask);
            mockRepo.update.mockResolvedValue({ ...sampleTask, title: 'Clean Title' });

            const res = await service.update(sampleTask.id, { title: '  Clean Title  ' });
            expect(res.title).toBe('Clean Title');
            expect(mockRepo.update).toHaveBeenCalledWith(sampleTask.id, { title: 'Clean Title' });
        });
    });

    describe('close', () => {
        it('soft-closes an inactive task', async () => {
            mockRepo.getById.mockResolvedValue({ ...sampleTask, status: 'done' });
            mockRepo.close.mockResolvedValue({ ...sampleTask, status: 'closed', closedAt: new Date() });

            const res = await service.close(sampleTask.id);
            expect(res.status).toBe('closed');
            expect(mockRepo.close).toHaveBeenCalledWith(sampleTask.id);
        });

        it('throws when closing an in_progress task', async () => {
            mockRepo.getById.mockResolvedValue({ ...sampleTask, status: 'in_progress' });
            await expect(service.close(sampleTask.id)).rejects.toThrow(
                'Cannot close an actively running task. Cancel the task first.',
            );
        });

        it('throws if task does not exist', async () => {
            mockRepo.getById.mockResolvedValue(undefined);
            await expect(service.close('missing')).rejects.toThrow('Task missing does not exist.');
        });
    });

    describe('overrideStatus', () => {
        it('overrides status of an inactive task', async () => {
            mockRepo.getById.mockResolvedValue({ ...sampleTask, status: 'failed' });
            mockRepo.updateStatus.mockResolvedValue({ ...sampleTask, status: 'not_started' });

            const res = await service.overrideStatus(sampleTask.id, 'not_started');
            expect(res.status).toBe('not_started');
            expect(mockRepo.updateStatus).toHaveBeenCalledWith(sampleTask.id, 'not_started');
        });

        it('throws if trying to override an in_progress task to non-cancelled status', async () => {
            mockRepo.getById.mockResolvedValue({ ...sampleTask, status: 'in_progress' });
            await expect(service.overrideStatus(sampleTask.id, 'done')).rejects.toThrow(
                'Cannot override status of an actively running task. Cancel the task first.',
            );
        });

        it('allows overriding in_progress task to cancelled', async () => {
            mockRepo.getById.mockResolvedValue({ ...sampleTask, status: 'in_progress' });
            mockRepo.updateStatus.mockResolvedValue({ ...sampleTask, status: 'cancelled' });

            const res = await service.overrideStatus(sampleTask.id, 'cancelled');
            expect(res.status).toBe('cancelled');
        });

        it('throws if task does not exist', async () => {
            mockRepo.getById.mockResolvedValue(undefined);
            await expect(service.overrideStatus('missing', 'done')).rejects.toThrow('Task missing does not exist.');
        });
    });

    describe('linkTasks and unlinkTasks', () => {
        it('throws if source links to itself', async () => {
            await expect(service.linkTasks('task-1', 'task-1')).rejects.toThrow('A task cannot link to itself.');
        });

        it('throws if source task does not exist', async () => {
            mockRepo.getById.mockImplementation(async (id: string) => {
                if (id === 'source-id') return undefined;
                return { ...sampleTask, id: id };
            });

            await expect(service.linkTasks('source-id', 'target-id')).rejects.toThrow(
                'Source task source-id does not exist.',
            );
        });

        it('throws if target task does not exist', async () => {
            mockRepo.getById.mockImplementation(async (id: string) => {
                if (id === 'target-id') return undefined;
                return { ...sampleTask, id: id };
            });

            await expect(service.linkTasks('source-id', 'target-id')).rejects.toThrow(
                'Target task target-id does not exist.',
            );
        });

        it('successfully links two tasks with no cycles', async () => {
            const taskA: Task = { ...sampleTask, id: 'task-A', nextTaskId: null };
            const taskB: Task = { ...sampleTask, id: 'task-B', nextTaskId: null };

            mockRepo.getById.mockImplementation(async (id: string) => {
                if (id === 'task-A') return taskA;
                if (id === 'task-B') return taskB;
                return undefined;
            });

            await service.linkTasks('task-A', 'task-B');
            expect(mockRepo.update).toHaveBeenCalledWith('task-A', { nextTaskId: 'task-B' });
        });

        it('terminates cycle traversal if an intermediate chained task is missing', async () => {
            const taskA: Task = { ...sampleTask, id: 'task-A', nextTaskId: null };
            const taskB: Task = { ...sampleTask, id: 'task-B', nextTaskId: 'missing-intermediate-id' };

            mockRepo.getById.mockImplementation(async (id: string) => {
                if (id === 'task-A') return taskA;
                if (id === 'task-B') return taskB;
                return undefined;
            });

            await service.linkTasks('task-A', 'task-B');
            expect(mockRepo.update).toHaveBeenCalledWith('task-A', { nextTaskId: 'task-B' });
        });

        it('detects direct circular dependency (B -> A when linking B to A)', async () => {
            // Already A -> B
            const taskA: Task = { ...sampleTask, id: 'task-A', nextTaskId: 'task-B' };
            const taskB: Task = { ...sampleTask, id: 'task-B', nextTaskId: null };

            mockRepo.getById.mockImplementation(async (id: string) => {
                if (id === 'task-A') return taskA;
                if (id === 'task-B') return taskB;
                return undefined;
            });

            // Trying to link B -> A should throw circular dependency
            await expect(service.linkTasks('task-B', 'task-A')).rejects.toThrow('Circular task dependency detected.');
            expect(mockRepo.update).not.toHaveBeenCalled();
        });

        it('detects indirect circular dependency (A -> B -> C, then linking C -> A)', async () => {
            const taskA: Task = { ...sampleTask, id: 'task-A', nextTaskId: 'task-B' };
            const taskB: Task = { ...sampleTask, id: 'task-B', nextTaskId: 'task-C' };
            const taskC: Task = { ...sampleTask, id: 'task-C', nextTaskId: null };

            mockRepo.getById.mockImplementation(async (id: string) => {
                if (id === 'task-A') return taskA;
                if (id === 'task-B') return taskB;
                if (id === 'task-C') return taskC;
                return undefined;
            });

            // Linking C -> A must be detected as cycle
            await expect(service.linkTasks('task-C', 'task-A')).rejects.toThrow('Circular task dependency detected.');
        });

        it('enforces maximum task chain depth limit of 25', async () => {
            const tasks: Record<string, Task> = {};
            for (let i = 1; i <= 30; i++) {
                tasks[`task-${i}`] = {
                    ...sampleTask,
                    id: `task-${i}`,
                    nextTaskId: i < 30 ? `task-${i + 1}` : null,
                };
            }

            mockRepo.getById.mockImplementation(async (id: string) => {
                return tasks[id];
            });

            // Try to link task-0 -> task-1 (chain of 30)
            const task0: Task = { ...sampleTask, id: 'task-0', nextTaskId: null };
            tasks['task-0'] = task0;

            await expect(service.linkTasks('task-0', 'task-1')).rejects.toThrow(
                'Task pipeline depth exceeds maximum limit of 25.',
            );
        });

        it('unlinks downstream task', async () => {
            mockRepo.getById.mockResolvedValue(sampleTask);

            await service.unlinkTasks(sampleTask.id);
            expect(mockRepo.update).toHaveBeenCalledWith(sampleTask.id, { nextTaskId: null });
        });

        it('throws when unlinking non-existent task', async () => {
            mockRepo.getById.mockResolvedValue(undefined);
            await expect(service.unlinkTasks('missing')).rejects.toThrow('Task missing does not exist.');
        });
    });

    describe('passthrough queries', () => {
        it('delegates list, getById, getWithLinks, updateStatus, and listByStatus', async () => {
            mockRepo.list.mockResolvedValue([sampleTask]);
            mockRepo.getById.mockResolvedValue(sampleTask);
            mockRepo.getWithLinks.mockResolvedValue({ ...sampleTask, nextTask: null, previousTask: null });
            mockRepo.updateStatus.mockResolvedValue({ ...sampleTask, status: 'done' });
            mockRepo.listByStatus.mockResolvedValue([sampleTask]);

            expect(await service.list({ status: 'not_started' })).toEqual([sampleTask]);
            expect(await service.getById('1')).toEqual(sampleTask);
            expect(await service.getWithLinks('1')).toEqual({ ...sampleTask, nextTask: null, previousTask: null });
            expect(await service.updateStatus('1', 'done')).toEqual({ ...sampleTask, status: 'done' });
            expect(await service.listByStatus('not_started')).toEqual([sampleTask]);
        });
    });
});
