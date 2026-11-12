import type {
    Task,
    TaskComment,
    TaskCommentInput,
    TaskCreateInput,
    TaskListFilter,
    TaskUpdateInput,
    TaskWithLinks,
} from 'core/dto';
import type { TaskCommentService } from 'core/services/TaskCommentService';
import type { TaskService } from 'core/services/TaskService';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TaskExecutionService } from '../services/TaskExecutionService';
import { TaskController } from './TaskController';

describe('TaskController', () => {
    let taskService: TaskService;
    let taskCommentService: TaskCommentService;
    let taskExecutionService: TaskExecutionService;
    let controller: TaskController;

    const mockTask: Task = {
        id: '11111111-1111-4111-8111-111111111111',
        title: 'Implement feature',
        description: 'Test description',
        workspacePath: '/path/to/project',
        runtime: 'model',
        provider: 'openai',
        modelId: 'gpt-4o',
        agentId: null,
        status: 'not_started',
        nextTaskId: null,
        executionStartedAt: null,
        executionEndedAt: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    beforeEach(() => {
        taskService = {
            list: vi.fn().mockResolvedValue([mockTask]),
            getWithLinks: vi.fn().mockResolvedValue({
                ...mockTask,
                nextTask: null,
                previousTask: null,
            } as TaskWithLinks),
            create: vi.fn().mockResolvedValue(mockTask),
            update: vi.fn().mockResolvedValue(mockTask),
            close: vi.fn().mockResolvedValue({ ...mockTask, status: 'closed' }),
            overrideStatus: vi.fn().mockResolvedValue({ ...mockTask, status: 'done' }),
            linkTasks: vi.fn().mockResolvedValue(undefined),
            unlinkTasks: vi.fn().mockResolvedValue(undefined),
        } as unknown as TaskService;

        taskCommentService = {
            listComments: vi.fn().mockResolvedValue([]),
            createComment: vi.fn().mockResolvedValue({
                id: '22222222-2222-4222-8222-222222222222',
                taskId: mockTask.id,
                authorType: 'human',
                authorLabel: 'User',
                content: 'Test comment',
                metadata: null,
                createdAt: new Date(),
            } as TaskComment),
        } as unknown as TaskCommentService;

        taskExecutionService = {
            execute: vi.fn().mockResolvedValue({ ...mockTask, status: 'in_progress' }),
            cancel: vi.fn().mockResolvedValue(undefined),
        } as unknown as TaskExecutionService;

        controller = new TaskController(taskService, taskCommentService, taskExecutionService);
    });

    describe('list', () => {
        it('forwards filter to taskService.list', async () => {
            const filter: TaskListFilter = { status: 'in_progress', includeClosed: false };
            const result = await controller.list(filter);

            expect(result).toEqual([mockTask]);
            expect(taskService.list).toHaveBeenCalledWith(filter);
        });

        it('works without filter argument', async () => {
            const result = await controller.list();

            expect(result).toEqual([mockTask]);
            expect(taskService.list).toHaveBeenCalledWith(undefined);
        });
    });

    describe('get', () => {
        it('retrieves task with links by id', async () => {
            const result = await controller.get(mockTask.id);

            expect(result).toBeDefined();
            expect(result?.id).toBe(mockTask.id);
            expect(taskService.getWithLinks).toHaveBeenCalledWith(mockTask.id);
        });
    });

    describe('create', () => {
        it('validates input and creates task', async () => {
            const input: TaskCreateInput = {
                title: 'New task',
                description: 'Work instructions',
                workspacePath: '/workspace',
                runtime: 'model',
                provider: 'openai',
                modelId: 'gpt-4o',
            };

            const result = await controller.create(input);

            expect(result).toEqual(mockTask);
            expect(taskService.create).toHaveBeenCalledWith(input);
        });

        it('throws when title or workspacePath is empty', async () => {
            await expect(
                controller.create({
                    title: '',
                    description: 'desc',
                    workspacePath: '/workspace',
                }),
            ).rejects.toThrow();

            await expect(
                controller.create({
                    title: 'Title',
                    description: '',
                    workspacePath: '/workspace',
                }),
            ).rejects.toThrow();

            await expect(
                controller.create({
                    title: 'Title',
                    description: 'desc',
                    workspacePath: '',
                }),
            ).rejects.toThrow();
        });
    });

    describe('update', () => {
        it('validates updates and delegates to taskService.update', async () => {
            const updates: TaskUpdateInput = {
                title: 'Updated title',
                runtime: 'agent',
                agentId: '33333333-3333-4333-8333-333333333333',
            };

            const result = await controller.update(mockTask.id, updates);

            expect(result).toEqual(mockTask);
            expect(taskService.update).toHaveBeenCalledWith(mockTask.id, updates);
        });

        it('throws when invalid uuid or empty title is passed', async () => {
            await expect(
                controller.update(mockTask.id, {
                    title: '',
                }),
            ).rejects.toThrow();
        });
    });

    describe('close', () => {
        it('delegates to taskService.close', async () => {
            const result = await controller.close(mockTask.id);

            expect(result.status).toBe('closed');
            expect(taskService.close).toHaveBeenCalledWith(mockTask.id);
        });
    });

    describe('overrideStatus', () => {
        it('validates status and delegates to taskService.overrideStatus', async () => {
            const result = await controller.overrideStatus(mockTask.id, 'done');

            expect(result.status).toBe('done');
            expect(taskService.overrideStatus).toHaveBeenCalledWith(mockTask.id, 'done');
        });

        it('throws for invalid status enum value', async () => {
            await expect(
                // @ts-expect-error test invalid enum
                controller.overrideStatus(mockTask.id, 'invalid_status'),
            ).rejects.toThrow();
        });
    });

    describe('link & unlink', () => {
        it('delegates linkTasks to taskService.linkTasks', async () => {
            const targetId = '44444444-4444-4444-8444-444444444444';
            await controller.link(mockTask.id, targetId);

            expect(taskService.linkTasks).toHaveBeenCalledWith(mockTask.id, targetId);
        });

        it('delegates unlink to taskService.unlinkTasks', async () => {
            await controller.unlink(mockTask.id);

            expect(taskService.unlinkTasks).toHaveBeenCalledWith(mockTask.id);
        });
    });

    describe('execute & cancel', () => {
        it('delegates execute to taskExecutionService.execute', async () => {
            const result = await controller.execute(mockTask.id);

            expect(result.status).toBe('in_progress');
            expect(taskExecutionService.execute).toHaveBeenCalledWith(mockTask.id);
        });

        it('delegates cancel to taskExecutionService.cancel', async () => {
            await controller.cancel(mockTask.id);

            expect(taskExecutionService.cancel).toHaveBeenCalledWith(mockTask.id);
        });
    });

    describe('comments', () => {
        it('delegates listComments to taskCommentService.listComments', async () => {
            const result = await controller.listComments(mockTask.id);

            expect(result).toEqual([]);
            expect(taskCommentService.listComments).toHaveBeenCalledWith(mockTask.id);
        });

        it('validates and delegates createComment to taskCommentService.createComment', async () => {
            const input: TaskCommentInput = {
                authorType: 'human',
                authorLabel: 'User',
                content: 'Need more tests',
            };

            const result = await controller.createComment(mockTask.id, input);

            expect(result.content).toBe('Test comment');
            expect(taskCommentService.createComment).toHaveBeenCalledWith({
                ...input,
                taskId: mockTask.id,
            });
        });

        it('throws when comment content is empty', async () => {
            await expect(
                controller.createComment(mockTask.id, {
                    authorType: 'human',
                    authorLabel: 'User',
                    content: '',
                }),
            ).rejects.toThrow();
        });
    });
});
