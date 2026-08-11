import { asc, eq } from 'drizzle-orm';
import { inject, injectable } from 'inversify';
import { DatabaseManager } from '../database/DatabaseManager';
import { acpAgent, acpRegistryCache } from '../database/schema/schema';
import type {
    AcpAgent,
    AcpAgentCreateInput,
    AcpAgentUpdateInput,
    AcpRegistryCache,
    AcpRegistryCacheInsert,
} from '../dto';
import { CORETYPES } from '../types/types';

@injectable()
export class AcpAgentRepository {
    private db;

    constructor(@inject(CORETYPES.DatabaseManager) databaseManager: DatabaseManager) {
        this.db = databaseManager.getInstance();
    }

    public async getAll(): Promise<AcpAgent[]> {
        return this.db.select().from(acpAgent).orderBy(asc(acpAgent.name));
    }

    public async getById(id: string): Promise<AcpAgent | undefined> {
        const result = await this.db.select().from(acpAgent).where(eq(acpAgent.id, id)).limit(1);
        return result[0];
    }

    public async getByName(name: string): Promise<AcpAgent | undefined> {
        const result = await this.db.select().from(acpAgent).where(eq(acpAgent.name, name)).limit(1);
        return result[0];
    }

    public async getByRegistryId(registryId: string): Promise<AcpAgent | undefined> {
        const result = await this.db.select().from(acpAgent).where(eq(acpAgent.registryId, registryId)).limit(1);
        return result[0];
    }

    public async create(input: AcpAgentCreateInput): Promise<AcpAgent> {
        const now = new Date();
        const [created] = await this.db
            .insert(acpAgent)
            .values({
                ...input,
                createdAt: now,
                updatedAt: now,
            })
            .returning();
        return created;
    }

    public async update(id: string, updates: AcpAgentUpdateInput): Promise<AcpAgent> {
        const [updated] = await this.db
            .update(acpAgent)
            .set({
                ...updates,
                updatedAt: new Date(),
            })
            .where(eq(acpAgent.id, id))
            .returning();
        return updated;
    }

    public async delete(id: string): Promise<void> {
        await this.db.delete(acpAgent).where(eq(acpAgent.id, id));
    }

    public async getRegistryCache(id = 'latest'): Promise<AcpRegistryCache | undefined> {
        const result = await this.db.select().from(acpRegistryCache).where(eq(acpRegistryCache.id, id)).limit(1);
        return result[0];
    }

    public async upsertRegistryCache(input: AcpRegistryCacheInsert): Promise<AcpRegistryCache> {
        const [saved] = await this.db
            .insert(acpRegistryCache)
            .values(input)
            .onConflictDoUpdate({
                target: acpRegistryCache.id,
                set: {
                    version: input.version,
                    data: input.data,
                    fetchedAt: input.fetchedAt ?? new Date(),
                    updatedAt: new Date(),
                },
            })
            .returning();
        return saved;
    }
}
