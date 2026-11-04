import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Task, TaskComment } from '../../dto';
import type { TaskCommentRepository } from '../../repositories/TaskCommentRepository';
import type { TaskRepository } from '../../repositories/TaskRepository';
import { TaskCommentService } from '../TaskCommentService';

describe('TaskCommentService', () => {
    let service: TaskCommentService;
    let mockCommentRepo: Record<keyof TaskCommentRepository, ReturnType<typeof vi.fn>>;
    let mockTaskRepo: Record<keyof TaskRepository, ReturnType<typeof vi.fn>>;

    const sampleTask: Task = {
        id: '22222222-2222-2222-2222-222222222222',
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

    const sampleComment: TaskComment = {
        id: '33333333-3333-3333-3333-333333333333',
        taskId: sampleTask.id,
        authorType: 'agent',
        authorLabel: 'Claude',
        content: 'Clean comment without secrets.',
        metadata: {},
        createdAt: new Date(),
    };

    beforeEach(() => {
        mockCommentRepo = {
            listByTaskId: vi.fn(),
            getById: vi.fn(),
            create: vi.fn(),
        };
        mockTaskRepo = {
            list: vi.fn(),
            getById: vi.fn(),
            getWithLinks: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            close: vi.fn(),
            updateStatus: vi.fn(),
            listByStatus: vi.fn(),
        };
        service = new TaskCommentService(
            mockCommentRepo as unknown as TaskCommentRepository,
            mockTaskRepo as unknown as TaskRepository,
        );
    });

    describe('listComments', () => {
        it('lists comments for an existing task', async () => {
            mockTaskRepo.getById.mockResolvedValue(sampleTask);
            mockCommentRepo.listByTaskId.mockResolvedValue([sampleComment]);

            const comments = await service.listComments(sampleTask.id);
            expect(comments).toEqual([sampleComment]);
            expect(mockCommentRepo.listByTaskId).toHaveBeenCalledWith(sampleTask.id);
        });

        it('throws if task does not exist', async () => {
            mockTaskRepo.getById.mockResolvedValue(undefined);
            await expect(service.listComments('missing-task')).rejects.toThrow('Task missing-task does not exist.');
        });
    });

    describe('createComment', () => {
        it('throws if content is empty or whitespace', async () => {
            await expect(
                service.createComment({
                    taskId: sampleTask.id,
                    authorType: 'human',
                    authorLabel: 'User',
                    content: '   ',
                }),
            ).rejects.toThrow('Comment content cannot be empty.');
        });

        it('throws if task does not exist', async () => {
            mockTaskRepo.getById.mockResolvedValue(undefined);
            await expect(
                service.createComment({
                    taskId: 'missing-id',
                    authorType: 'human',
                    authorLabel: 'User',
                    content: 'Valid content',
                }),
            ).rejects.toThrow('Task missing-id does not exist.');
        });

        it('scrubs Bearer tokens, OpenAI keys, and GitHub personal access tokens', async () => {
            mockTaskRepo.getById.mockResolvedValue(sampleTask);
            mockCommentRepo.create.mockImplementation(async (input) => {
                return {
                    id: 'comment-1',
                    ...input,
                    createdAt: new Date(),
                };
            });

            const dirtyContent =
                'Header: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.secretKey1234567890\n' +
                'OpenAI Key: sk-proj-1234567890abcdef1234567890abcdef\n' +
                'GitHub Token: ghp_1234567890abcdef1234567890abcdef123456';

            await service.createComment({
                taskId: sampleTask.id,
                authorType: 'agent',
                authorLabel: 'Agent X',
                content: dirtyContent,
            });

            expect(mockCommentRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    taskId: sampleTask.id,
                    content:
                        'Header: Bearer [REDACTED]\n' +
                        'OpenAI Key: [REDACTED_API_KEY]\n' +
                        'GitHub Token: [REDACTED_GITHUB_TOKEN]',
                }),
            );
        });
    });

    describe('getById', () => {
        it('delegates getById to repository', async () => {
            mockCommentRepo.getById.mockResolvedValue(sampleComment);
            const res = await service.getById(sampleComment.id);
            expect(res).toEqual(sampleComment);
            expect(mockCommentRepo.getById).toHaveBeenCalledWith(sampleComment.id);
        });
    });
});
