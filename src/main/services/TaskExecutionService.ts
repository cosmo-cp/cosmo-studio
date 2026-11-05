import fs from 'fs';
import os from 'os';
import path from 'path';
import { generateText, stepCountIs, tool, type ToolSet } from 'ai';
import type { Task } from 'core/dto';
import { McpClientManager } from 'core/services/McpClientManager';
import { ModelProviderService } from 'core/services/ModelProviderService';
import { TaskCommentService } from 'core/services/TaskCommentService';
import { TaskService } from 'core/services/TaskService';
import { CORETYPES } from 'core/types/types';
import log from 'electron-log/main';
import { inject, injectable } from 'inversify';
import { z } from 'zod';
import { TYPES } from '../types';
import { AcpAgentRuntimeService } from './AcpAgentRuntimeService';

const logger = log.scope('tasks');

const MAX_UPSTREAM_CONTEXT_CHARS = 8000; // ~2,000 tokens per Section 4.9

// Check if workspace target points to forbidden OS root or credential directories.
const isProtectedRoot = (canonicalPath: string): boolean => {
    // Forbid root directory directly
    if (canonicalPath === path.resolve('/')) {
        return true;
    }

    const homedir = os.homedir();
    const forbiddenDirs = ['/etc', '/System', '/Windows', path.join(homedir, '.ssh'), path.join(homedir, '.aws')];

    for (const raw of forbiddenDirs) {
        if (!fs.existsSync(raw)) {
            continue;
        }
        let resolved = raw;
        try {
            resolved = fs.realpathSync(raw);
        } catch {
            resolved = path.resolve(raw);
        }
        if (canonicalPath === resolved) {
            return true;
        }
        const prefix = resolved.endsWith(path.sep) ? resolved : `${resolved}${path.sep}`;
        if (canonicalPath.startsWith(prefix)) {
            return true;
        }
    }

    return false;
};

@injectable()
export class TaskExecutionService {
    // Canonical workspace path -> active taskId
    private readonly activeWorkspaces = new Map<string, string>();
    private readonly activeAbortControllers = new Map<string, AbortController>();

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
    ) {}

    // Verify workspace existence, prevent forbidden root access, and acquire mutual exclusion.
    public validateAndLockWorkspace(workspacePath: string, taskId: string): string {
        if (!fs.existsSync(workspacePath)) {
            throw new Error(`Workspace path does not exist: ${workspacePath}`);
        }

        const canonicalPath = fs.realpathSync(path.resolve(workspacePath));

        if (isProtectedRoot(canonicalPath)) {
            throw new Error(
                `Targeting sensitive system directory or credential root is not permitted: ${workspacePath}`,
            );
        }

        if (this.activeWorkspaces.has(canonicalPath)) {
            const activeTaskId = this.activeWorkspaces.get(canonicalPath);
            logger.warn('Workspace collision rejected:', {
                taskId: taskId,
                activeTaskId: activeTaskId,
                canonicalPath: canonicalPath,
            });
            throw new Error(`Workspace is currently busy running Task ${activeTaskId}.`);
        }

        this.activeWorkspaces.set(canonicalPath, taskId);
        return canonicalPath;
    }

    // Inspect if a workspace directory is currently locked by a running task.
    public isWorkspaceActive(workspacePath: string): boolean {
        try {
            if (!fs.existsSync(workspacePath)) {
                return false;
            }
            const canonicalPath = fs.realpathSync(path.resolve(workspacePath));
            return this.activeWorkspaces.has(canonicalPath);
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

        const canonicalPath = this.validateAndLockWorkspace(targetTask.workspacePath, taskId);
        const inProgressTask = await this.taskService.updateStatus(taskId, 'in_progress');

        const abortController = new AbortController();
        this.activeAbortControllers.set(taskId, abortController);

        logger.info('Starting task execution:', {
            taskId: targetTask.id,
            workspacePath: canonicalPath,
            runtime: targetTask.runtime,
            provider: targetTask.provider,
            modelId: targetTask.modelId,
        });

        // Fire asynchronous background execution without blocking the IPC response
        void this.runTask(targetTask, canonicalPath, abortController.signal);

        return inProgressTask;
    }

    // Cancel an actively running task execution, aborting the process and releasing the workspace.
    public async cancel(taskId: string): Promise<void> {
        const controller = this.activeAbortControllers.get(taskId);
        if (controller) {
            controller.abort();
            this.activeAbortControllers.delete(taskId);
        }

        // Immediately release workspace lock associated with this task
        for (const [workspacePath, activeTaskId] of this.activeWorkspaces.entries()) {
            if (activeTaskId === taskId) {
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
    private async runTask(currentTask: Task, canonicalPath: string, signal: AbortSignal): Promise<void> {
        let taskVerdict: { summary: string; status: 'done' | 'failed' } | null = null;
        let lockReleased = false;

        const completeTaskTool = tool({
            description: 'Signal task completion or failure with a summary of the outcome.',
            parameters: z.object({
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
                    currentTask.workspacePath,
                    currentTask.id,
                );

                try {
                    const result = await generateText({
                        // @ts-expect-error/type-does-not-exist
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
                    // @ts-expect-error/type-does-not-exist
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
            this.activeWorkspaces.delete(canonicalPath);
            this.activeAbortControllers.delete(currentTask.id);
            lockReleased = true;

            // Sequential chain handoff if task succeeded - refresh task record to capture any links added mid-flight
            if (verdictStatus === 'done') {
                const latestTask = await this.taskService.getById(currentTask.id);
                if (latestTask?.nextTaskId) {
                    const nextTask = await this.taskService.getById(latestTask.nextTaskId);
                    if (nextTask && nextTask.status === 'not_started') {
                        logger.info(`Advancing pipeline: triggering downstream task ${nextTask.id}`);
                        await this.execute(nextTask.id);
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
                this.activeWorkspaces.delete(canonicalPath);
                this.activeAbortControllers.delete(currentTask.id);
            }
        }
    }
}
