import fs from 'fs';
import os from 'os';
import path from 'path';
import type { Task, TaskComment } from 'core/dto';
import type { McpClientManager } from 'core/services/McpClientManager';
import type { ModelProviderService } from 'core/services/ModelProviderService';
import type { TaskCommentService } from 'core/services/TaskCommentService';
import type { TaskService } from 'core/services/TaskService';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AcpAgentRuntimeService } from '../AcpAgentRuntimeService';
import { TaskExecutionService } from '../TaskExecutionService';

const ai = vi.hoisted(() => {
    return {
        generateText: vi.fn(),
        stepCountIs: vi.fn((count: number) => {
            return `steps:${count}`;
        }),
        tool: vi.fn((config: unknown) => {
            return config;
        }),
    };
});

vi.mock('ai', () => {
    return {
        generateText: ai.generateText,
        stepCountIs: ai.stepCountIs,
        tool: ai.tool,
    };
});

vi.mock('electron-log/main', () => {
    return {
        default: {
            scope: () => {
                return {
                    info: vi.fn(),
                    warn: vi.fn(),
                    error: vi.fn(),
                };
            },
        },
    };
});

describe('TaskExecutionService', () => {
    let service: TaskExecutionService;
    let mockTaskService: Record<keyof TaskService, ReturnType<typeof vi.fn>>;
    let mockTaskCommentService: Record<keyof TaskCommentService, ReturnType<typeof vi.fn>>;
    let mockModelProviderService: Record<keyof ModelProviderService, ReturnType<typeof vi.fn>>;
    let mockMcpClientManager: Record<keyof McpClientManager, ReturnType<typeof vi.fn>>;
    let mockAcpAgentRuntimeService: Record<keyof AcpAgentRuntimeService, ReturnType<typeof vi.fn>>;

    let tempWorkspaceDir: string;

    const sampleTask: Task = {
        id: '11111111-1111-1111-1111-111111111111',
        title: 'Build Module',
        description: 'Implement core functionality',
        status: 'not_started',
        workspacePath: '',
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
        tempWorkspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cosmo-task-test-'));

        mockTaskService = {
            list: vi.fn(),
            getById: vi.fn(),
            getWithLinks: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            close: vi.fn(),
            overrideStatus: vi.fn(),
            linkTasks: vi.fn(),
            unlinkTasks: vi.fn(),
            updateStatus: vi.fn(),
            listByStatus: vi.fn(),
        };

        mockTaskCommentService = {
            listComments: vi.fn().mockResolvedValue([]),
            createComment: vi.fn(),
            getById: vi.fn(),
        };

        mockModelProviderService = {
            getModelProviderRegistry: vi.fn().mockResolvedValue({
                languageModel: vi.fn().mockReturnValue('mock-language-model'),
            }),
        } as unknown as Record<keyof ModelProviderService, ReturnType<typeof vi.fn>>;

        mockMcpClientManager = {
            getAllTools: vi.fn().mockResolvedValue({}),
        } as unknown as Record<keyof McpClientManager, ReturnType<typeof vi.fn>>;

        mockAcpAgentRuntimeService = {
            createProvider: vi.fn(),
        } as unknown as Record<keyof AcpAgentRuntimeService, ReturnType<typeof vi.fn>>;

        service = new TaskExecutionService(
            mockTaskService as unknown as TaskService,
            mockTaskCommentService as unknown as TaskCommentService,
            mockModelProviderService as unknown as ModelProviderService,
            mockMcpClientManager as unknown as McpClientManager,
            mockAcpAgentRuntimeService as unknown as AcpAgentRuntimeService,
        );
    });

    afterEach(() => {
        try {
            fs.rmSync(tempWorkspaceDir, { recursive: true, force: true });
        } catch {
            // Ignore cleanup errors
        }
        vi.clearAllMocks();
    });

    describe('validateAndLockWorkspace and isWorkspaceActive', () => {
        it('throws if workspace path does not exist', () => {
            const missing = path.join(tempWorkspaceDir, 'does-not-exist');
            expect(() => {
                return service.validateAndLockWorkspace(missing, 'task-1');
            }).toThrow(`Workspace path does not exist: ${missing}`);
        });

        it('throws if workspace path targets protected system or credentials roots', () => {
            const forbiddenPaths = [
                path.resolve('/'),
                path.resolve('/etc'),
                path.resolve('/System'),
                path.resolve(os.homedir(), '.ssh'),
            ];

            for (const f of forbiddenPaths) {
                if (fs.existsSync(f)) {
                    expect(() => {
                        return service.validateAndLockWorkspace(f, 'task-1');
                    }).toThrow('Targeting sensitive system directory or credential root is not permitted');
                }
            }
        });

        it('locks workspace path and detects collision', () => {
            expect(service.isWorkspaceActive(tempWorkspaceDir)).toBe(false);

            const lockedCanonical = service.validateAndLockWorkspace(tempWorkspaceDir, 'task-1');
            expect(lockedCanonical).toBe(fs.realpathSync(tempWorkspaceDir));
            expect(service.isWorkspaceActive(tempWorkspaceDir)).toBe(true);

            // Second attempt on the same workspace throws collision error
            expect(() => {
                return service.validateAndLockWorkspace(tempWorkspaceDir, 'task-2');
            }).toThrow('Workspace is currently busy running Task task-1.');
        });

        it('returns false for isWorkspaceActive if path is non-existent or error thrown', () => {
            expect(service.isWorkspaceActive('/non/existent/path/abc')).toBe(false);

            // Spy on realpathSync to throw error
            vi.spyOn(fs, 'realpathSync').mockImplementationOnce(() => {
                throw new Error('IO failure');
            });
            expect(service.isWorkspaceActive(tempWorkspaceDir)).toBe(false);
        });
    });

    describe('reconcileInterruptedTasks', () => {
        it('marks in_progress tasks as failed on recovery', async () => {
            const t1: Task = { ...sampleTask, id: 'task-crash-1', status: 'in_progress' };
            const t2: Task = { ...sampleTask, id: 'task-crash-2', status: 'in_progress' };
            mockTaskService.listByStatus.mockResolvedValue([t1, t2]);

            await service.reconcileInterruptedTasks();

            expect(mockTaskService.updateStatus).toHaveBeenCalledWith('task-crash-1', 'failed');
            expect(mockTaskService.updateStatus).toHaveBeenCalledWith('task-crash-2', 'failed');
            expect(mockTaskCommentService.createComment).toHaveBeenCalledTimes(2);
            expect(mockTaskCommentService.createComment).toHaveBeenCalledWith(
                expect.objectContaining({
                    taskId: 'task-crash-1',
                    authorType: 'system',
                    content: 'Task execution interrupted due to unexpected application shutdown or restart.',
                }),
            );
        });

        it('is a no-op if no tasks are in_progress', async () => {
            mockTaskService.listByStatus.mockResolvedValue([]);
            await service.reconcileInterruptedTasks();
            expect(mockTaskService.updateStatus).not.toHaveBeenCalled();
            expect(mockTaskCommentService.createComment).not.toHaveBeenCalled();
        });
    });

    describe('execute', () => {
        it('throws if task does not exist', async () => {
            mockTaskService.getById.mockResolvedValue(undefined);
            await expect(service.execute('missing')).rejects.toThrow('Task missing does not exist.');
        });

        it('starts non-blocking execution and completes with model runtime', async () => {
            const taskRecord: Task = {
                ...sampleTask,
                workspacePath: tempWorkspaceDir,
            };
            mockTaskService.getById.mockResolvedValue(taskRecord);
            mockTaskService.updateStatus.mockImplementation(async (id, status) => {
                return {
                    ...taskRecord,
                    status: status,
                };
            });
            mockTaskService.getWithLinks.mockResolvedValue({
                ...taskRecord,
                nextTask: null,
                previousTask: null,
            });

            ai.generateText.mockImplementation(async (opts) => {
                // Call completeTask tool
                if (opts.tools?.completeTask?.execute) {
                    await opts.tools.completeTask.execute({
                        status: 'done',
                        summary: 'Created necessary files successfully.',
                    });
                }
                return { text: 'Assistant output text' };
            });

            // execute returns immediately with status in_progress
            const returned = await service.execute(taskRecord.id);
            expect(returned.status).toBe('in_progress');
            expect(service.isWorkspaceActive(tempWorkspaceDir)).toBe(true);

            // Wait a tick for the background promise to finish
            await new Promise((resolve) => {
                return setTimeout(resolve, 50);
            });

            expect(mockTaskCommentService.createComment).toHaveBeenCalledWith(
                expect.objectContaining({
                    taskId: taskRecord.id,
                    authorType: 'agent',
                    content: 'Created necessary files successfully.',
                }),
            );
            expect(mockTaskService.updateStatus).toHaveBeenCalledWith(taskRecord.id, 'done');
            // Workspace lock should be released
            expect(service.isWorkspaceActive(tempWorkspaceDir)).toBe(false);
        });

        it('defaults to done when model finishes without calling completeTask tool', async () => {
            const taskRecord: Task = {
                ...sampleTask,
                workspacePath: tempWorkspaceDir,
            };
            mockTaskService.getById.mockResolvedValue(taskRecord);
            mockTaskService.updateStatus.mockImplementation(async (id, status) => {
                return {
                    ...taskRecord,
                    status: status,
                };
            });
            mockTaskService.getWithLinks.mockResolvedValue({
                ...taskRecord,
                nextTask: null,
                previousTask: null,
            });

            ai.generateText.mockResolvedValue({
                text: 'Generated text without tool call.',
            });

            await service.execute(taskRecord.id);
            await new Promise((resolve) => {
                return setTimeout(resolve, 50);
            });

            expect(mockTaskCommentService.createComment).toHaveBeenCalledWith(
                expect.objectContaining({
                    taskId: taskRecord.id,
                    authorType: 'agent',
                    content: 'Generated text without tool call.',
                }),
            );
            expect(mockTaskService.updateStatus).toHaveBeenCalledWith(taskRecord.id, 'done');
        });

        it('executes ACP agent runtime and releases provider', async () => {
            const cleanupFn = vi.fn();
            const providerMock = {
                languageModel: vi.fn().mockReturnValue('mock-acp-model'),
                tools: {},
                cleanup: cleanupFn,
            };
            mockAcpAgentRuntimeService.createProvider.mockResolvedValue(providerMock);

            const agentTask: Task = {
                ...sampleTask,
                id: 'agent-task-1',
                runtime: 'agent',
                agentId: '99999999-9999-9999-9999-999999999999',
                workspacePath: tempWorkspaceDir,
            };
            mockTaskService.getById.mockResolvedValue(agentTask);
            mockTaskService.updateStatus.mockImplementation(async (id, status) => {
                return {
                    ...agentTask,
                    status: status,
                };
            });
            mockTaskService.getWithLinks.mockResolvedValue({
                ...agentTask,
                nextTask: null,
                previousTask: null,
            });

            ai.generateText.mockResolvedValue({ text: 'ACP agent output' });

            await service.execute(agentTask.id);
            await new Promise((resolve) => {
                return setTimeout(resolve, 50);
            });

            expect(mockAcpAgentRuntimeService.createProvider).toHaveBeenCalledWith(
                agentTask.agentId,
                agentTask.workspacePath,
                agentTask.id,
            );
            expect(cleanupFn).toHaveBeenCalled();
            expect(mockTaskService.updateStatus).toHaveBeenCalledWith(agentTask.id, 'done');
        });

        it('throws if ACP agent task has no agentId', async () => {
            const agentTaskNoId: Task = {
                ...sampleTask,
                id: 'agent-no-id',
                runtime: 'agent',
                agentId: null,
                workspacePath: tempWorkspaceDir,
            };
            mockTaskService.getById.mockResolvedValue(agentTaskNoId);
            mockTaskService.updateStatus.mockImplementation(async (id, status) => {
                return {
                    ...agentTaskNoId,
                    status: status,
                };
            });
            mockTaskService.getWithLinks.mockResolvedValue({
                ...agentTaskNoId,
                nextTask: null,
                previousTask: null,
            });

            await service.execute(agentTaskNoId.id);
            await new Promise((resolve) => {
                return setTimeout(resolve, 50);
            });

            expect(mockTaskCommentService.createComment).toHaveBeenCalledWith(
                expect.objectContaining({
                    taskId: agentTaskNoId.id,
                    authorType: 'system',
                    content: expect.stringContaining('ACP Agent ID is required for agent runtime'),
                }),
            );
            expect(mockTaskService.updateStatus).toHaveBeenCalledWith(agentTaskNoId.id, 'failed');
            expect(service.isWorkspaceActive(tempWorkspaceDir)).toBe(false);
        });

        it('handles execution failure and records system comment', async () => {
            const taskRecord: Task = {
                ...sampleTask,
                workspacePath: tempWorkspaceDir,
            };
            mockTaskService.getById.mockResolvedValue(taskRecord);
            mockTaskService.updateStatus.mockImplementation(async (id, status) => {
                return {
                    ...taskRecord,
                    status: status,
                };
            });
            mockTaskService.getWithLinks.mockResolvedValue({
                ...taskRecord,
                nextTask: null,
                previousTask: null,
            });

            ai.generateText.mockRejectedValue(new Error('API quota exceeded'));

            await service.execute(taskRecord.id);
            await new Promise((resolve) => {
                return setTimeout(resolve, 50);
            });

            expect(mockTaskCommentService.createComment).toHaveBeenCalledWith(
                expect.objectContaining({
                    taskId: taskRecord.id,
                    authorType: 'system',
                    content: 'Task failed with error: API quota exceeded',
                }),
            );
            expect(mockTaskService.updateStatus).toHaveBeenCalledWith(taskRecord.id, 'failed');
            expect(service.isWorkspaceActive(tempWorkspaceDir)).toBe(false);
        });

        it('assembles upstream task context within XML tags and truncates if large', async () => {
            const upstreamTask: Task = {
                ...sampleTask,
                id: 'upstream-task-id',
                title: 'Task A (Upstream)',
                description: 'Generated files in repository',
            };

            const downstreamTask: Task = {
                ...sampleTask,
                id: 'downstream-task-id',
                title: 'Task B (Downstream)',
                description: 'Run verification tests',
                workspacePath: tempWorkspaceDir,
            };

            mockTaskService.getById.mockResolvedValue(downstreamTask);
            mockTaskService.updateStatus.mockImplementation(async (id, status) => {
                return {
                    ...downstreamTask,
                    status: status,
                };
            });
            mockTaskService.getWithLinks.mockResolvedValue({
                ...downstreamTask,
                nextTask: null,
                previousTask: upstreamTask,
            });

            // Huge summary comment to test truncation (> 8000 chars)
            const hugeSummary = 'X'.repeat(9000);
            mockTaskCommentService.listComments.mockResolvedValue([
                {
                    id: 'comment-1',
                    taskId: upstreamTask.id,
                    authorType: 'agent',
                    authorLabel: 'Agent',
                    content: hugeSummary,
                    createdAt: new Date(),
                } as TaskComment,
            ]);

            ai.generateText.mockResolvedValue({ text: 'All tests passed' });

            await service.execute(downstreamTask.id);
            await new Promise((resolve) => {
                return setTimeout(resolve, 50);
            });

            expect(ai.generateText).toHaveBeenCalledWith(
                expect.objectContaining({
                    prompt: expect.stringContaining('<upstream_task_context>'),
                }),
            );
            const promptArg = ai.generateText.mock.calls[0][0].prompt as string;
            expect(promptArg).toContain('### Upstream Task: Task A (Upstream)');
            expect(promptArg).toContain('... [truncated]');
            expect(promptArg).toContain('</upstream_task_context>');
        });

        it('advances sequential chain handoff on done without workspace collision', async () => {
            const taskA: Task = {
                ...sampleTask,
                id: 'task-chain-A',
                workspacePath: tempWorkspaceDir,
                nextTaskId: 'task-chain-B',
            };
            const taskB: Task = {
                ...sampleTask,
                id: 'task-chain-B',
                workspacePath: tempWorkspaceDir,
                nextTaskId: null,
                status: 'not_started',
            };

            mockTaskService.getById.mockImplementation(async (id: string) => {
                if (id === 'task-chain-A') return taskA;
                if (id === 'task-chain-B') return taskB;
                return undefined;
            });
            mockTaskService.updateStatus.mockImplementation(async (id, status) => {
                if (id === 'task-chain-A') return { ...taskA, status: status };
                if (id === 'task-chain-B') return { ...taskB, status: status };
                return sampleTask;
            });
            mockTaskService.getWithLinks.mockResolvedValue({
                ...taskA,
                nextTask: taskB,
                previousTask: null,
            });

            ai.generateText.mockResolvedValue({ text: 'Success' });

            await service.execute(taskA.id);
            await new Promise((resolve) => {
                return setTimeout(resolve, 100);
            });

            // Verify task A completed
            expect(mockTaskService.updateStatus).toHaveBeenCalledWith('task-chain-A', 'done');
            // Verify task B was triggered
            expect(mockTaskService.updateStatus).toHaveBeenCalledWith('task-chain-B', 'in_progress');
        });
    });

    describe('cancel', () => {
        it('aborts running task and transitions to cancelled', async () => {
            const taskRecord: Task = {
                ...sampleTask,
                workspacePath: tempWorkspaceDir,
            };
            mockTaskService.getById.mockResolvedValue({ ...taskRecord, status: 'in_progress' });
            mockTaskService.updateStatus.mockImplementation(async (id, status) => {
                return {
                    ...taskRecord,
                    status: status,
                };
            });
            mockTaskService.getWithLinks.mockResolvedValue({
                ...taskRecord,
                nextTask: null,
                previousTask: null,
            });

            // Long-running execution
            ai.generateText.mockImplementation(async ({ abortSignal }: { abortSignal?: AbortSignal }) => {
                return new Promise((resolve, reject) => {
                    abortSignal?.addEventListener('abort', () => {
                        reject(new Error('Execution was aborted'));
                    });
                });
            });

            await service.execute(taskRecord.id);
            expect(service.isWorkspaceActive(tempWorkspaceDir)).toBe(true);

            await service.cancel(taskRecord.id);
            await new Promise((resolve) => {
                return setTimeout(resolve, 50);
            });

            expect(mockTaskService.overrideStatus).toHaveBeenCalledWith(taskRecord.id, 'cancelled');
            expect(mockTaskCommentService.createComment).toHaveBeenCalledWith(
                expect.objectContaining({
                    taskId: taskRecord.id,
                    authorType: 'system',
                    content: 'Task execution cancelled by user.',
                }),
            );
            expect(service.isWorkspaceActive(tempWorkspaceDir)).toBe(false);
        });

        it('silently returns if aborted right after generateText finishes', async () => {
            const taskRecord: Task = {
                ...sampleTask,
                workspacePath: tempWorkspaceDir,
            };
            mockTaskService.getById.mockResolvedValue(taskRecord);
            mockTaskService.updateStatus.mockImplementation(async (id, status) => {
                return {
                    ...taskRecord,
                    status: status,
                };
            });
            mockTaskService.getWithLinks.mockResolvedValue({
                ...taskRecord,
                nextTask: null,
                previousTask: null,
            });

            ai.generateText.mockImplementation(async () => {
                await service.cancel(taskRecord.id);
                return { text: 'Done' };
            });

            await service.execute(taskRecord.id);
            await new Promise((resolve) => {
                return setTimeout(resolve, 50);
            });

            // Since it was aborted, status shouldn't be set to done
            expect(mockTaskService.updateStatus).not.toHaveBeenCalledWith(taskRecord.id, 'done');
        });

        it('logs and continues if recording failure throws an error', async () => {
            const taskRecord: Task = {
                ...sampleTask,
                workspacePath: tempWorkspaceDir,
            };
            mockTaskService.getById.mockResolvedValue(taskRecord);
            mockTaskService.updateStatus.mockImplementation(async (id, status) => {
                return {
                    ...taskRecord,
                    status: status,
                };
            });
            mockTaskService.getWithLinks.mockResolvedValue({
                ...taskRecord,
                nextTask: null,
                previousTask: null,
            });

            ai.generateText.mockRejectedValue('String error');
            mockTaskCommentService.createComment.mockRejectedValue(new Error('DB connection dead'));

            await service.execute(taskRecord.id);
            await new Promise((resolve) => {
                return setTimeout(resolve, 50);
            });

            expect(service.isWorkspaceActive(tempWorkspaceDir)).toBe(false);
        });

        it('catches error and silently returns if signal was aborted', async () => {
            const taskRecord: Task = {
                ...sampleTask,
                status: 'in_progress',
                workspacePath: tempWorkspaceDir,
            };
            mockTaskService.getById.mockResolvedValue(taskRecord);
            mockTaskService.updateStatus.mockImplementation(async (id, status) => {
                return {
                    ...taskRecord,
                    status: status,
                };
            });
            mockTaskService.getWithLinks.mockResolvedValue({
                ...taskRecord,
                nextTask: null,
                previousTask: null,
            });

            ai.generateText.mockImplementation(async () => {
                await service.cancel(taskRecord.id);
                throw new Error('Aborted error from provider');
            });

            await service.execute(taskRecord.id);
            await new Promise((resolve) => {
                return setTimeout(resolve, 50);
            });

            expect(mockTaskService.overrideStatus).toHaveBeenCalledWith(taskRecord.id, 'cancelled');
        });
    });
});
