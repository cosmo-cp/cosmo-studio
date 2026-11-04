import { and, desc, eq, ne, type SQL } from 'drizzle-orm';
import { inject, injectable } from 'inversify';
import { DatabaseManager } from '../database/DatabaseManager';
import { task } from '../database/schema/schema';
import { Task, TaskCreateInput, TaskListFilter, TaskUpdateInput, TaskWithLinks } from '../dto';
import { CORETYPES } from '../types/types';

@injectable()
export class TaskRepository {
    private db;

    constructor(@inject(CORETYPES.DatabaseManager) databaseManager: DatabaseManager) {
        this.db = databaseManager.getInstance();
    }

    // Retrieve tasks filtered by execution state and archive status for list rendering.
    public async list(filter?: TaskListFilter): Promise<Task[]> {
        const conditions: SQL[] = [];

        if (filter?.status) {
            conditions.push(eq(task.status, filter.status));
        }

        if (!filter?.includeClosed) {
            conditions.push(ne(task.status, 'closed'));
        }

        const query = this.db.select().from(task);
        if (conditions.length > 0) {
            return query.where(and(...conditions)).orderBy(desc(task.updatedAt));
        }

        return query.orderBy(desc(task.updatedAt));
    }

    // Locate a specific task by identifier for execution, updates, and linking.
    public async getById(id: string): Promise<Task | undefined> {
        const result = await this.db.select().from(task).where(eq(task.id, id)).limit(1);
        return result[0];
    }

    // Support bidirectional pipeline inspection in UI link cards without join tables.
    public async getWithLinks(id: string): Promise<TaskWithLinks | undefined> {
        const currentTask = await this.getById(id);
        if (!currentTask) {
            return undefined;
        }

        let nextTask: Task | null = null;
        if (currentTask.nextTaskId) {
            nextTask = (await this.getById(currentTask.nextTaskId)) ?? null;
        }

        const [previousTaskResult] = await this.db.select().from(task).where(eq(task.nextTaskId, id)).limit(1);

        return {
            ...currentTask,
            nextTask: nextTask,
            previousTask: previousTaskResult ?? null,
        };
    }

    // Persist newly submitted user tasks ready for agent assignment or manual dispatch.
    public async create(data: TaskCreateInput): Promise<Task> {
        const now = new Date();
        const [createdTask] = await this.db
            .insert(task)
            .values({
                ...data,
                createdAt: now,
                updatedAt: now,
            })
            .returning();
        return createdTask;
    }

    // Modify task attributes, workspace target, or downstream pointers while refreshing timestamp.
    public async update(id: string, updates: TaskUpdateInput): Promise<Task> {
        const [updatedTask] = await this.db
            .update(task)
            .set({
                ...updates,
                updatedAt: new Date(),
            })
            .where(eq(task.id, id))
            .returning();
        return updatedTask;
    }

    // Enforce the permanent retention soft-close policy without deleting historical records.
    public async close(id: string): Promise<Task> {
        const now = new Date();
        const [closedTask] = await this.db
            .update(task)
            .set({
                status: 'closed',
                closedAt: now,
                updatedAt: now,
            })
            .where(eq(task.id, id))
            .returning();
        return closedTask;
    }

    // Transition execution lifecycle state during agent execution, abort, or manual status override.
    public async updateStatus(id: string, status: Task['status']): Promise<Task> {
        const [updatedTask] = await this.db
            .update(task)
            .set({
                status: status,
                updatedAt: new Date(),
            })
            .where(eq(task.id, id))
            .returning();
        return updatedTask;
    }

    // Query active tasks during application startup for crash recovery reconciliation.
    public async listByStatus(status: Task['status']): Promise<Task[]> {
        return this.db.select().from(task).where(eq(task.status, status)).orderBy(desc(task.updatedAt));
    }
}
