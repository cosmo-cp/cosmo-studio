import { asc, eq } from 'drizzle-orm';
import { inject, injectable } from 'inversify';
import { DatabaseManager } from '../database/DatabaseManager';
import { taskComment } from '../database/schema/schema';
import { TaskComment, TaskCommentCreateInput } from '../dto';
import { CORETYPES } from '../types/types';

@injectable()
export class TaskCommentRepository {
    private db;

    constructor(@inject(CORETYPES.DatabaseManager) databaseManager: DatabaseManager) {
        this.db = databaseManager.getInstance();
    }

    // Provide a chronological audit trail of human notes, agent outputs, and system events.
    public async listByTaskId(taskId: string): Promise<TaskComment[]> {
        return this.db
            .select()
            .from(taskComment)
            .where(eq(taskComment.taskId, taskId))
            .orderBy(asc(taskComment.createdAt));
    }

    // Locate a specific comment record for verification and testing.
    public async getById(id: string): Promise<TaskComment | undefined> {
        const [result] = await this.db.select().from(taskComment).where(eq(taskComment.id, id)).limit(1);
        return result;
    }

    // Persist human feedback, agent execution outcome summaries, or system crash notices.
    public async create(data: TaskCommentCreateInput): Promise<TaskComment> {
        const now = new Date();
        const [createdComment] = await this.db
            .insert(taskComment)
            .values({
                ...data,
                createdAt: now,
            })
            .returning();
        return createdComment;
    }
}
