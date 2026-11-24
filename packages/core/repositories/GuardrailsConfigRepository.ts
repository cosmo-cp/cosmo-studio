import { eq } from 'drizzle-orm';
import { inject, injectable } from 'inversify';
import { DatabaseManager } from '../database/DatabaseManager';
import { guardrailsConfig } from '../database/schema/guardrailsConfigSchema';
import type { GuardrailsConfig, GuardrailsConfigSaveInput } from '../dto';
import { CORETYPES } from '../types/types';

@injectable()
export class GuardrailsConfigRepository {
    private db;

    constructor(@inject(CORETYPES.DatabaseManager) databaseManager: DatabaseManager) {
        this.db = databaseManager.getInstance();
    }

    /**
     * Retrieves the current guardrails configuration if saved in the database.
     */
    public async get(): Promise<GuardrailsConfig | undefined> {
        const rows = await this.db.select().from(guardrailsConfig).limit(1);
        return rows[0];
    }

    /**
     * Saves or updates the singleton guardrails configuration.
     */
    public async save(input: GuardrailsConfigSaveInput): Promise<GuardrailsConfig> {
        const existing = await this.get();
        if (existing) {
            const [updated] = await this.db
                .update(guardrailsConfig)
                .set({
                    ...input,
                    updatedAt: new Date(),
                })
                .where(eq(guardrailsConfig.id, existing.id))
                .returning();
            return updated;
        }

        const [created] = await this.db
            .insert(guardrailsConfig)
            .values({
                ...input,
            })
            .returning();
        return created;
    }
}
