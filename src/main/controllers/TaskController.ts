import type {
    Task,
    TaskComment,
    TaskCommentInput,
    TaskCreateInput,
    TaskListFilter,
    TaskUpdateInput,
    TaskWithLinks,
} from 'core/dto';
import { TaskCommentService } from 'core/services/TaskCommentService';
import { TaskService } from 'core/services/TaskService';
import { CORETYPES } from 'core/types/types';
import { inject, injectable } from 'inversify';
import { z } from 'zod';
import { IpcController, IpcHandler } from '../ipc/Decorators';
import { TaskExecutionService } from '../services/TaskExecutionService';
import { TYPES } from '../types';
import { Controller } from './Controller';

const taskStatusEnumSchema = z.enum(['not_started', 'in_progress', 'done', 'failed', 'cancelled', 'closed']);

const taskListFilterSchema = z.object({
    status: taskStatusEnumSchema.optional(),
    includeClosed: z.boolean().optional(),
});

const taskCreateSchema = z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    workspacePath: z.string().min(1),
    runtime: z.enum(['model', 'agent']).optional(),
    provider: z.string().optional().nullable(),
    modelId: z.string().optional().nullable(),
    agentId: z.string().uuid().optional().nullable(),
});

const taskUpdateSchema = z.object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    workspacePath: z.string().min(1).optional(),
    runtime: z.enum(['model', 'agent']).optional(),
    provider: z.string().optional().nullable(),
    modelId: z.string().optional().nullable(),
    agentId: z.string().uuid().optional().nullable(),
});

const commentCreateSchema = z.object({
    authorType: z.enum(['human', 'agent', 'system']).default('human'),
    authorLabel: z.string().min(1).default('User'),
    content: z.string().min(1),
    metadata: z.record(z.unknown()).optional(),
});

@injectable()
@IpcController('task')
export class TaskController implements Controller {
    constructor(
        @inject(CORETYPES.TaskService)
        private readonly taskService: TaskService,
        @inject(CORETYPES.TaskCommentService)
        private readonly taskCommentService: TaskCommentService,
        @inject(TYPES.TaskExecutionService)
        private readonly taskExecutionService: TaskExecutionService,
    ) {}

    // Provide filterable tasks list for the left panel in the tasks dashboard.
    @IpcHandler('list', z.tuple([taskListFilterSchema.optional()]))
    public async list(filter?: TaskListFilter): Promise<Task[]> {
        return this.taskService.list(filter);
    }

    // Retrieve detailed task attributes along with forward and reverse pipeline links.
    @IpcHandler('get', z.tuple([z.string().uuid()]))
    public async get(id: string): Promise<TaskWithLinks | undefined> {
        return this.taskService.getWithLinks(id);
    }

    // Persist a new task record with user-provided instructions and workspace directory.
    @IpcHandler('create', z.tuple([taskCreateSchema]))
    public async create(input: TaskCreateInput): Promise<Task> {
        const parsed = taskCreateSchema.parse(input);
        return this.taskService.create(parsed as TaskCreateInput);
    }

    // Modify task details, workspace location, or model assignments with in-progress protection.
    @IpcHandler('update', z.tuple([z.string().uuid(), taskUpdateSchema]))
    public async update(id: string, updates: TaskUpdateInput): Promise<Task> {
        const parsed = taskUpdateSchema.parse(updates);
        return this.taskService.update(id, parsed as TaskUpdateInput);
    }

    // Soft-close a task according to the permanent retention policy without hard deleting.
    @IpcHandler('close', z.tuple([z.string().uuid()]))
    public async close(id: string): Promise<Task> {
        return this.taskService.close(id);
    }

    // Allow user intervention to manually set or reset task status.
    @IpcHandler('overrideStatus', z.tuple([z.string().uuid(), taskStatusEnumSchema]))
    public async overrideStatus(id: string, status: Task['status']): Promise<Task> {
        const parsedStatus = taskStatusEnumSchema.parse(status);
        return this.taskService.overrideStatus(id, parsedStatus);
    }

    // Connect source task to target task sequentially with cycle prevention.
    @IpcHandler('link', z.tuple([z.string().uuid(), z.string().uuid()]))
    public async link(sourceTaskId: string, targetTaskId: string): Promise<void> {
        return this.taskService.linkTasks(sourceTaskId, targetTaskId);
    }

    // Sever the downstream link pointer from a task.
    @IpcHandler('unlink', z.tuple([z.string().uuid()]))
    public async unlink(sourceTaskId: string): Promise<void> {
        return this.taskService.unlinkTasks(sourceTaskId);
    }

    // Trigger non-blocking asynchronous execution using AI SDK or ACP coding agent.
    @IpcHandler('execute', z.tuple([z.string().uuid()]))
    public async execute(taskId: string): Promise<Task> {
        return this.taskExecutionService.execute(taskId);
    }

    // Cancel an actively running task and immediately release its workspace lock.
    @IpcHandler('cancel', z.tuple([z.string().uuid()]))
    public async cancel(taskId: string): Promise<void> {
        return this.taskExecutionService.cancel(taskId);
    }

    // Retrieve the chronological comments and outcome summaries for a task.
    @IpcHandler('listComments', z.tuple([z.string().uuid()]))
    public async listComments(taskId: string): Promise<TaskComment[]> {
        return this.taskCommentService.listComments(taskId);
    }

    // Append human notes or instructions to the task audit trail with secret scrubbing.
    @IpcHandler('createComment', z.tuple([z.string().uuid(), commentCreateSchema]))
    public async createComment(taskId: string, input: TaskCommentInput): Promise<TaskComment> {
        const parsed = commentCreateSchema.parse(input);
        return this.taskCommentService.createComment({
            ...parsed,
            taskId: taskId,
        });
    }
}
