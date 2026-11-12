import { inject, injectable } from 'inversify';
import { Task, TaskCreateInput, TaskListFilter, TaskUpdateInput, TaskWithLinks } from '../dto';
import { getCoreLogger } from '../platform/CoreLogger';
import { TaskRepository } from '../repositories/TaskRepository';
import { CORETYPES } from '../types/types';
import { WorkspaceService } from './WorkspaceService';

const MAX_TASK_CHAIN_DEPTH = 25;

// Normalize required non-empty string fields before persistence.
const normalizeRequired = (value: string | null | undefined, field: string): string => {
    if (!value || value.trim().length === 0) {
        throw new Error(`${field} is required.`);
    }
    return value.trim();
};

@injectable()
export class TaskService {
    constructor(
        @inject(CORETYPES.TaskRepository)
        private taskRepository: TaskRepository,
        @inject(CORETYPES.WorkspaceService)
        private workspaceService: WorkspaceService,
    ) {}

    // Retrieve tasks filtered by execution state and archive status for list rendering.
    public async list(filter?: TaskListFilter): Promise<Task[]> {
        return this.taskRepository.list(filter);
    }

    // Locate a specific task by identifier for execution, updates, and linking.
    public async getById(id: string): Promise<Task | undefined> {
        return this.taskRepository.getById(id);
    }

    // Support bidirectional pipeline inspection in UI link cards without join tables.
    public async getWithLinks(id: string): Promise<TaskWithLinks | undefined> {
        return this.taskRepository.getWithLinks(id);
    }

    // Validate inputs and persist newly created tasks.
    public async create(input: TaskCreateInput): Promise<Task> {
        const title = normalizeRequired(input.title, 'Title');
        let workspacePath = input.workspacePath ? input.workspacePath.trim() : '';
        const workspaceId = input.workspaceId ?? null;

        if (workspaceId) {
            const ws = await this.workspaceService.get(workspaceId);
            if (!ws) {
                throw new Error(`Workspace ${workspaceId} does not exist.`);
            }
            workspacePath = ws.canonicalPath;
        } else if (!workspacePath) {
            throw new Error('Workspace path is required.');
        }

        getCoreLogger().info(`Creating task "${title}" targeting workspace: ${workspacePath}`);

        return this.taskRepository.create({
            ...input,
            title: title,
            workspacePath: workspacePath,
            workspaceId: workspaceId,
            status: input.status ?? 'not_started',
            runtime: input.runtime ?? 'model',
        });
    }

    // Update task metadata while guarding against race conditions on running tasks.
    public async update(id: string, updates: TaskUpdateInput): Promise<Task> {
        const existing = await this.taskRepository.getById(id);
        if (!existing) {
            throw new Error(`Task ${id} does not exist.`);
        }

        const sanitized: TaskUpdateInput = { ...updates };

        if (updates.workspaceId !== undefined) {
            if (updates.workspaceId) {
                const ws = await this.workspaceService.get(updates.workspaceId);
                if (!ws) {
                    throw new Error(`Workspace ${updates.workspaceId} does not exist.`);
                }
                sanitized.workspacePath = ws.canonicalPath;
            } else {
                sanitized.workspaceId = null;
            }
        }

        if (updates.workspacePath !== undefined && !updates.workspaceId) {
            sanitized.workspacePath = normalizeRequired(updates.workspacePath, 'Workspace path');
        }

        if (
            existing.status === 'in_progress' &&
            sanitized.workspacePath &&
            sanitized.workspacePath !== existing.workspacePath
        ) {
            throw new Error('Cannot change workspace path while task is actively running. Cancel the task first.');
        }

        if (updates.title !== undefined) {
            sanitized.title = normalizeRequired(updates.title, 'Title');
        }

        return this.taskRepository.update(id, sanitized);
    }

    // Enforce the permanent retention soft-close policy without deleting historical records.
    public async close(id: string): Promise<Task> {
        const existing = await this.taskRepository.getById(id);
        if (!existing) {
            throw new Error(`Task ${id} does not exist.`);
        }

        if (existing.status === 'in_progress') {
            throw new Error('Cannot close an actively running task. Cancel the task first.');
        }

        getCoreLogger().info(`Soft-closing task ${id}`);
        return this.taskRepository.close(id);
    }

    // Allow manual user intervention to override lifecycle status.
    public async overrideStatus(id: string, status: Task['status']): Promise<Task> {
        const existing = await this.taskRepository.getById(id);
        if (!existing) {
            throw new Error(`Task ${id} does not exist.`);
        }

        if (existing.status === 'in_progress' && status !== 'cancelled') {
            throw new Error('Cannot override status of an actively running task. Cancel the task first.');
        }

        getCoreLogger().info(`Manual status override for task ${id}: ${existing.status} -> ${status}`);
        return this.taskRepository.updateStatus(id, status);
    }

    // Form a sequential 1:1 execution link between two tasks with linear cycle detection.
    public async linkTasks(sourceTaskId: string, targetTaskId: string): Promise<void> {
        if (sourceTaskId === targetTaskId) {
            throw new Error('A task cannot link to itself.');
        }

        const [sourceTask, targetTask] = await Promise.all([
            this.taskRepository.getById(sourceTaskId),
            this.taskRepository.getById(targetTaskId),
        ]);

        if (!sourceTask) {
            throw new Error(`Source task ${sourceTaskId} does not exist.`);
        }
        if (!targetTask) {
            throw new Error(`Target task ${targetTaskId} does not exist.`);
        }

        const existingPredecessor = await this.taskRepository.getPredecessor(targetTaskId);
        if (existingPredecessor && existingPredecessor.id !== sourceTaskId) {
            throw new Error(
                `Target task ${targetTaskId} is already linked to predecessor task "${existingPredecessor.title}".`,
            );
        }

        const visited = new Set<string>([sourceTaskId, targetTaskId]);
        let curr: string | null = targetTask.nextTaskId ?? null;
        let depth = 1;

        while (curr) {
            if (visited.has(curr)) {
                getCoreLogger().warn(
                    `Cycle detected while linking task ${sourceTaskId} -> ${targetTaskId} at node ${curr}`,
                );
                throw new Error('Circular task dependency detected.');
            }
            visited.add(curr);
            depth++;
            if (depth > MAX_TASK_CHAIN_DEPTH) {
                throw new Error(`Task pipeline depth exceeds maximum limit of ${MAX_TASK_CHAIN_DEPTH}.`);
            }
            const next = await this.taskRepository.getById(curr);
            curr = next?.nextTaskId ?? null;
        }

        getCoreLogger().info(`Linked task ${sourceTaskId} to downstream task ${targetTaskId} (depth: ${depth})`);
        await this.taskRepository.update(sourceTaskId, { nextTaskId: targetTaskId });
    }

    // Sever the downstream link pointer from a task.
    public async unlinkTasks(sourceTaskId: string): Promise<void> {
        const existing = await this.taskRepository.getById(sourceTaskId);
        if (!existing) {
            throw new Error(`Task ${sourceTaskId} does not exist.`);
        }

        getCoreLogger().info(`Unlinking downstream task from ${sourceTaskId}`);
        await this.taskRepository.update(sourceTaskId, { nextTaskId: null });
    }

    // Update execution status programmatically from the background execution engine.
    public async updateStatus(id: string, status: Task['status']): Promise<Task> {
        return this.taskRepository.updateStatus(id, status);
    }

    // List tasks matching status for recovery or bulk operations.
    public async listByStatus(status: Task['status']): Promise<Task[]> {
        return this.taskRepository.listByStatus(status);
    }
}
