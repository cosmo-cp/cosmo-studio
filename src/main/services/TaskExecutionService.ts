import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { generateText, stepCountIs, tool, type ToolSet } from 'ai';
import type { Task } from 'core/dto';
import { McpClientManager } from 'core/services/McpClientManager';
import { ModelProviderService } from 'core/services/ModelProviderService';
import { TaskCommentService } from 'core/services/TaskCommentService';
import { TaskService } from 'core/services/TaskService';
import { WorkspaceService } from 'core/services/WorkspaceService';
import { CORETYPES } from 'core/types/types';
import { isProtectedRoot } from 'core/utils/pathSecurity';
import log from 'electron-log/main';
import { inject, injectable } from 'inversify';
import { z } from 'zod';
import { TYPES } from '../types';
import { AcpAgentRuntimeService } from './AcpAgentRuntimeService';
import { WorkspaceBusyError, WorkspaceExecutionLockService } from './WorkspaceExecutionLockService';

const logger = log.scope('tasks');

const MAX_UPSTREAM_CONTEXT_CHARS = 8000; // ~2,000 tokens per Section 4.9

@injectable()
export class TaskExecutionService {
    // Canonical workspace path -> active { taskId, executionId }
    private readonly activeWorkspaces = new Map<string, { taskId: string; executionId: string }>();
    private readonly activeAbortControllers = new Map<string, { controller: AbortController; executionId: string }>();

    constructor(
        @inject(CORETYPES.TaskService)
        private readonly taskService: TaskService,
        @inject(CORETYPES.TaskCommentService)
        private readonly taskCommentService: TaskCommentService,
        @inject(CORETYPES.ModelProviderService)
        private readonly modelProviderService: ModelProviderService,
        @inject(CORETYPES.McpClientManager)
        private readonly mcpClientManager: McpClientManager,
        @inject(TYPES.AcpAgentRuntimeService)
        private readonly acpAgentRuntimeService: AcpAgentRuntimeService,
        @inject(TYPES.WorkspaceExecutionLockService)
        private readonly workspaceLockService: WorkspaceExecutionLockService,
        @inject(CORETYPES.WorkspaceService)
        private readonly workspaceService: WorkspaceService,
    ) {}

    // Verify workspace existence, prevent forbidden root access, and acquire mutual exclusion.
    public validateAndLockWorkspace(
        workspacePath: string,
        taskId: string,
        executionId: string = crypto.randomUUID(),
        abortSignal?: AbortSignal,
    ): string {
        if (!fs.existsSync(workspacePath)) {
            throw new Error(`Workspace path does not exist: ${workspacePath}`);
        }

        const canonicalPath = fs.realpathSync(path.resolve(workspacePath));

        if (isProtectedRoot(canonicalPath)) {
            throw new Error(
                `Targeting sensitive system directory or credential root is not permitted: ${workspacePath}`,
            );
        }

        try {
            this.workspaceLockService.acquireLease(canonicalPath, 'task', taskId, abortSignal);
        } catch (err) {
            if (err instanceof WorkspaceBusyError) {
                logger.warn('Workspace collision rejected:', {
                    taskId: taskId,
                    activeOwner: err.ownerId,
                    activeType: err.ownerType,
                    canonicalPath: canonicalPath,
                });
                throw new Error(
                    `Workspace is currently busy running ${err.ownerType === 'task' ? 'Task ' : 'Chat '}${err.ownerId}.`,
                );
            }
            throw err;
        }

        this.activeWorkspaces.set(canonicalPath, { taskId: taskId, executionId: executionId });
        return canonicalPath;
    }

    // Safely release workspace lock and abort controller only if executionId matches.
    private releaseLock(canonicalPath: string, taskId: string, executionId: string): void {
        const activeLock = this.activeWorkspaces.get(canonicalPath);
        if (activeLock && activeLock.executionId === executionId) {
            this.workspaceLockService.releaseLease(canonicalPath, taskId);
            this.activeWorkspaces.delete(canonicalPath);
        }

        const activeAbort = this.activeAbortControllers.get(taskId);
        if (activeAbort && activeAbort.executionId === executionId) {
            this.activeAbortControllers.delete(taskId);
        }
    }

    // Inspect if a workspace directory is currently locked by a running task.
    public isWorkspaceActive(workspacePath: string): boolean {
        try {
            if (!fs.existsSync(workspacePath)) {
                return false;
            }
            const canonicalPath = fs.realpathSync(path.resolve(workspacePath));
            return this.workspaceLockService.isWorkspaceBusy(canonicalPath);
        } catch {
            return false;
        }
    }

    // Launch non-blocking background task execution, returning the in-progress task immediately.
    public async execute(taskId: string): Promise<Task> {
        const targetTask = await this.taskService.getById(taskId);
        if (!targetTask) {
            throw new Error(`Task ${taskId} does not exist.`);
        }

        let targetWorkspacePath = targetTask.workspacePath;
        if (targetTask.workspaceId) {
            const ws = await this.workspaceService.get(targetTask.workspaceId);
            if (ws) {
                targetWorkspacePath = ws.canonicalPath;
            }
        }

        const executionId = crypto.randomUUID();
        const abortController = new AbortController();
        const canonicalPath = this.validateAndLockWorkspace(
            targetWorkspacePath,
            taskId,
            executionId,
            abortController.signal,
        );
        const inProgressTask = await this.taskService.updateStatus(taskId, 'in_progress');

        this.activeAbortControllers.set(taskId, { controller: abortController, executionId: executionId });

        logger.info('Starting task execution:', {
            taskId: targetTask.id,
            executionId: executionId,
            workspacePath: canonicalPath,
            runtime: targetTask.runtime,
            provider: targetTask.provider,
            modelId: targetTask.modelId,
        });

        // Fire asynchronous background execution without blocking the IPC response
        void this.runTask(targetTask, canonicalPath, executionId, abortController.signal);

        return inProgressTask;
    }

    // Cancel an actively running task execution, aborting the process and releasing the workspace.
    public async cancel(taskId: string): Promise<void> {
        const active = this.activeAbortControllers.get(taskId);
        if (active) {
            active.controller.abort();
            this.activeAbortControllers.delete(taskId);
        }

        // Immediately release workspace lock associated with this task execution
        for (const [workspacePath, lockInfo] of this.activeWorkspaces.entries()) {
            if (lockInfo.taskId === taskId && (!active || lockInfo.executionId === active.executionId)) {
                this.workspaceLockService.releaseLease(workspacePath, taskId);
                this.activeWorkspaces.delete(workspacePath);
                break;
            }
        }

        const taskRecord = await this.taskService.getById(taskId);
        if (taskRecord && taskRecord.status === 'in_progress') {
            await this.taskService.overrideStatus(taskId, 'cancelled');
            await this.taskCommentService.createComment({
                taskId: taskId,
                authorType: 'system',
                authorLabel: 'Cosmo System',
                content: 'Task execution cancelled by user.',
            });
        }
    }

    // Reset tasks left in progress during an ungraceful shutdown or crash.
    public async reconcileInterruptedTasks(): Promise<void> {
        const interruptedTasks = await this.taskService.listByStatus('in_progress');
        if (interruptedTasks.length === 0) {
            return;
        }

        logger.info(`Reconciling ${interruptedTasks.length} interrupted task(s)...`);

        for (const t of interruptedTasks) {
            await this.taskService.updateStatus(t.id, 'failed');
            await this.taskCommentService.createComment({
                taskId: t.id,
                authorType: 'system',
                authorLabel: 'Cosmo System',
                content: 'Task execution interrupted due to unexpected application shutdown or restart.',
                metadata: { interruptedAt: new Date().toISOString() },
            });
        }
    }

    // Build task prompt encapsulating upstream context within XML delimiters.
    private async assemblePrompt(currentTask: Task): Promise<string> {
        const withLinks = await this.taskService.getWithLinks(currentTask.id);
        const upstreamTask = withLinks?.previousTask;

        if (!upstreamTask) {
            return currentTask.description;
        }

        // Retrieve upstream summary comments
        const upstreamComments = await this.taskCommentService.listComments(upstreamTask.id);
        const lastAgentComment = [...upstreamComments].reverse().find((c) => {
            return c.authorType === 'agent';
        });

        const upstreamSummary = lastAgentComment?.content ?? 'No outcome summary recorded.';

        let upstreamContext = `### Upstream Task: ${upstreamTask.title}\n${upstreamTask.description}\n\n### Upstream Outcome Summary\n${upstreamSummary}`;
        if (upstreamContext.length > MAX_UPSTREAM_CONTEXT_CHARS) {
            upstreamContext = `${upstreamContext.slice(0, MAX_UPSTREAM_CONTEXT_CHARS)}... [truncated]`;
        }

        return [
            '## Task Instructions',
            currentTask.description,
            '',
            '<upstream_task_context>',
            upstreamContext,
            '</upstream_task_context>',
        ].join('\n');
    }

    // Background execution worker executing tools, updating database, and triggering downstream tasks.
    private async runTask(
        currentTask: Task,
        canonicalPath: string,
        executionId: string,
        signal: AbortSignal,
    ): Promise<void> {
        let taskVerdict: { summary: string; status: 'done' | 'failed' } | null = null;
        let lockReleased = false;

        const completeTaskTool = tool({
            description: 'Signal task completion or failure with a summary of the outcome.',
            inputSchema: z.object({
                status: z.enum(['done', 'failed']).describe('Whether the task was completed successfully or failed.'),
                summary: z
                    .string()
                    .describe('Detailed summary of the actions taken, files modified, or failure reason.'),
            }),
            execute: async ({ status, summary }) => {
                taskVerdict = { status: status, summary: summary };
                return `Task status recorded as ${status}.`;
            },
        });

        try {
            const prompt = await this.assemblePrompt(currentTask);
            let finalOutputText = '';

            if (currentTask.runtime === 'agent') {
                if (!currentTask.agentId) {
                    throw new Error(`ACP Agent ID is required for agent runtime.`);
                }
                const provider = await this.acpAgentRuntimeService.createProvider(
                    currentTask.agentId,
                    canonicalPath,
                    currentTask.id,
                );

                try {
                    const result = await generateText({
                        model: provider.languageModel(),
                        prompt: prompt,
                        tools: {
                            ...((provider.tools ?? {}) as ToolSet),
                            completeTask: completeTaskTool,
                        },
                        stopWhen: stepCountIs(20),
                        abortSignal: signal,
                    });
                    finalOutputText = result.text;
                } finally {
                    provider.cleanup();
                }
            } else {
                const modelIdentifier = `${currentTask.provider}:${currentTask.modelId}`;
                const registry = await this.modelProviderService.getModelProviderRegistry();
                const mcpTools = await this.mcpClientManager.getAllTools();

                const result = await generateText({
                    model: registry.languageModel(modelIdentifier as `${string}:${string}`),
                    prompt: prompt,
                    tools: {
                        ...mcpTools,
                        completeTask: completeTaskTool,
                    },
                    stopWhen: stepCountIs(20),
                    abortSignal: signal,
                });
                finalOutputText = result.text;
            }

            if (signal.aborted) {
                return;
            }

            const verdictStatus: 'done' | 'failed' = taskVerdict?.status ?? 'done';
            const verdictSummary: string =
                taskVerdict?.summary || finalOutputText.trim() || 'Task execution completed successfully.';

            await this.taskCommentService.createComment({
                taskId: currentTask.id,
                authorType: 'agent',
                authorLabel: currentTask.modelId ?? currentTask.agentId ?? 'AI Worker',
                content: verdictSummary,
                metadata: {
                    status: verdictStatus,
                    runtime: currentTask.runtime,
                },
            });

            await this.taskService.updateStatus(currentTask.id, verdictStatus);

            // Workspace lock release MUST happen before downstream handoff
            this.releaseLock(canonicalPath, currentTask.id, executionId);
            lockReleased = true;

            // Sequential chain handoff if task succeeded - refresh task record to capture any links added mid-flight
            if (verdictStatus === 'done') {
                const latestTask = await this.taskService.getById(currentTask.id);
                if (latestTask?.nextTaskId) {
                    const nextTask = await this.taskService.getById(latestTask.nextTaskId);
                    if (nextTask && nextTask.status === 'not_started') {
                        logger.info(`Advancing pipeline: triggering downstream task ${nextTask.id}`);
                        try {
                            await this.execute(nextTask.id);
                        } catch (downstreamError) {
                            logger.error(
                                `Failed to trigger downstream task ${nextTask.id} from task ${currentTask.id}:`,
                                downstreamError,
                            );
                            const downstreamMessage =
                                downstreamError instanceof Error ? downstreamError.message : String(downstreamError);
                            await this.taskCommentService.createComment({
                                taskId: currentTask.id,
                                authorType: 'system',
                                authorLabel: 'Cosmo System',
                                content: `Pipeline handoff to downstream task "${nextTask.title}" failed: ${downstreamMessage}`,
                                metadata: {
                                    downstreamTaskId: nextTask.id,
                                    error: downstreamMessage,
                                },
                            });
                        }
                    }
                }
            }
        } catch (error) {
            if (signal.aborted) {
                logger.info(`Task ${currentTask.id} execution aborted.`);
                return;
            }

            logger.error(`Error during task ${currentTask.id} execution:`, error);
            const errorMessage = error instanceof Error ? error.message : String(error);

            try {
                await this.taskCommentService.createComment({
                    taskId: currentTask.id,
                    authorType: 'system',
                    authorLabel: 'Cosmo System',
                    content: `Task failed with error: ${errorMessage}`,
                    metadata: { error: errorMessage },
                });
                await this.taskService.updateStatus(currentTask.id, 'failed');
            } catch (persistErr) {
                logger.error(`Failed to record failure status for task ${currentTask.id}:`, persistErr);
            }
        } finally {
            if (!lockReleased) {
                this.releaseLock(canonicalPath, currentTask.id, executionId);
            }
        }
    }
}
