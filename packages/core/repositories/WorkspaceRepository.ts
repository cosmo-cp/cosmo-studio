import { desc, eq } from 'drizzle-orm';
import { inject, injectable } from 'inversify';
import { DatabaseManager } from '../database/DatabaseManager';
import { workspace } from '../database/schema/schema';
import { Workspace, WorkspaceInsert } from '../dto';
import { CORETYPES } from '../types/types';
import { isValidUuid } from '../utils/uuid';

@injectable()
export class WorkspaceRepository {
    private db;

    constructor(@inject(CORETYPES.DatabaseManager) databaseManager: DatabaseManager) {
        this.db = databaseManager.getInstance();
    }

    /**
     * Retrieves all registered workspaces ordered by creation date descending.
     */
    public async listAll(): Promise<Workspace[]> {
        return this.db.select().from(workspace).orderBy(desc(workspace.createdAt));
    }

    /**
     * Finds a workspace by unique ID.
     */
    public async getById(id: string): Promise<Workspace | undefined> {
        if (!isValidUuid(id)) {
            return undefined;
        }
        const [result] = await this.db.select().from(workspace).where(eq(workspace.id, id)).limit(1);
        return result;
    }

    /**
     * Finds a workspace by canonical filesystem path.
     */
    public async findByCanonicalPath(canonicalPath: string): Promise<Workspace | undefined> {
        const [result] = await this.db
            .select()
            .from(workspace)
            .where(eq(workspace.canonicalPath, canonicalPath))
            .limit(1);
        return result;
    }

    /**
     * Inserts a new workspace record.
     */
    public async create(data: WorkspaceInsert): Promise<Workspace> {
        const [result] = await this.db.insert(workspace).values(data).returning();
        return result;
    }

    /**
     * Updates an existing workspace record.
     */
    public async update(
        id: string,
        data: Partial<Pick<Workspace, 'name' | 'canonicalPath' | 'rawPath'>>,
    ): Promise<Workspace | undefined> {
        if (!isValidUuid(id)) {
            return undefined;
        }
        const [result] = await this.db
            .update(workspace)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(workspace.id, id))
            .returning();
        return result;
    }

    /**
     * Deletes a workspace record by ID.
     */
    public async delete(id: string): Promise<boolean> {
        if (!isValidUuid(id)) {
            return false;
        }
        const result = await this.db.delete(workspace).where(eq(workspace.id, id)).returning();
        return result.length > 0;
    }
}
