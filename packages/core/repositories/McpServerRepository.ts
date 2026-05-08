import { inject, injectable } from 'inversify';
import { asc, eq } from 'drizzle-orm';
import { CORETYPES } from '../types/types';
import { DatabaseManager } from '../database/DatabaseManager';
import { mcpServer } from '../database/schema/schema';
import { McpServer, McpServerInsert, McpServerUpdateInput } from '../dto';

@injectable()
export class McpServerRepository {
    private db;

    constructor(@inject(CORETYPES.DatabaseManager) databaseManager: DatabaseManager) {
        this.db = databaseManager.getInstance();
    }

    public async getAll(): Promise<McpServer[]> {
        return this.db.select().from(mcpServer).orderBy(asc(mcpServer.name));
    }

    public async getAllEnabled(): Promise<McpServer[]> {
        return this.db.select().from(mcpServer).where(eq(mcpServer.enabled, true)).orderBy(asc(mcpServer.name));
    }

    public async getById(id: string): Promise<McpServer | undefined> {
        const result = await this.db.select().from(mcpServer).where(eq(mcpServer.id, id)).limit(1);
        return result[0];
    }

    public async getByName(name: string): Promise<McpServer | undefined> {
        const result = await this.db.select().from(mcpServer).where(eq(mcpServer.name, name)).limit(1);
        return result[0];
    }

    public async create(data: McpServerInsert): Promise<McpServer> {
        const now = new Date();
        const [createdServer] = await this.db
            .insert(mcpServer)
            .values({
                ...data,
                createdAt: data.createdAt ?? now,
                updatedAt: data.updatedAt ?? now,
            })
            .returning();
        return createdServer;
    }

    public async update(id: string, updates: McpServerUpdateInput): Promise<McpServer> {
        const [updatedServer] = await this.db
            .update(mcpServer)
            .set({
                ...updates,
                updatedAt: new Date(),
            })
            .where(eq(mcpServer.id, id))
            .returning();
        return updatedServer;
    }

    public async delete(id: string): Promise<void> {
        await this.db.delete(mcpServer).where(eq(mcpServer.id, id));
    }
}
