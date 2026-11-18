import { eq } from 'drizzle-orm';
import { inject, injectable } from 'inversify';
import { DatabaseManager } from '../database/DatabaseManager';
import { experimentalFlag, userProfile } from '../database/schema/schema';
import type { UserProfileRecord } from '../dto';
import { CORETYPES } from '../types/types';

@injectable()
export class UserProfileRepository {
    private db;

    constructor(@inject(CORETYPES.DatabaseManager) databaseManager: DatabaseManager) {
        this.db = databaseManager.getInstance();
    }

    /** Reads all saved experimental choices for a single bulk evaluation. */
    public async getExperimentalFlags(): Promise<Record<string, boolean>> {
        const rows = await this.db.select().from(experimentalFlag);
        return Object.fromEntries(
            rows.map((row) => {
                return [row.key, row.enabled];
            }),
        );
    }

    /** Saves one choice atomically without overwriting other flags. */
    public async saveExperimentalFlag(key: string, enabled: boolean): Promise<void> {
        await this.db
            .insert(experimentalFlag)
            .values({ key: key, enabled: enabled })
            .onConflictDoUpdate({
                target: experimentalFlag.key,
                set: { enabled: enabled },
            });
    }

    /**
     * Retrieves the current user profile record if saved in the database.
     */
    public async get(): Promise<UserProfileRecord | undefined> {
        const rows = await this.db.select().from(userProfile).limit(1);
        return rows[0];
    }

    /**
     * Saves or updates the user profile record with the given name and photo.
     */
    public async save(name: string, photo?: string | null): Promise<UserProfileRecord> {
        const existing = await this.get();
        const payload: { name: string; photo?: string | null; updatedAt?: Date } = {
            name: name.trim(),
        };
        if (photo !== undefined) {
            payload.photo = photo;
        }

        if (existing) {
            payload.updatedAt = new Date();
            const [updated] = await this.db
                .update(userProfile)
                .set(payload)
                .where(eq(userProfile.id, existing.id))
                .returning();
            return updated;
        }

        const [created] = await this.db
            .insert(userProfile)
            .values({
                name: name.trim(),
                photo: photo ?? null,
            })
            .returning();
        return created;
    }
}
