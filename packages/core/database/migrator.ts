import fs from 'fs';
import path from 'path';
import { sql } from 'drizzle-orm';
import { PgliteDatabase } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { getCoreLogger } from '../platform/CoreLogger';
import * as schema from './schema/schema';

export const CORE_MIGRATIONS_TABLE = '__drizzle_migrations_core';

function hasMigrationJournal(migrationDir: string): boolean {
    return fs.existsSync(path.join(migrationDir, 'meta', '_journal.json'));
}

function resolveMigrationsFolder(): string {
    const candidates = [
        path.resolve(__dirname, './migrations/core'),
        path.resolve(process.cwd(), 'migrations/core'),
        path.resolve(__dirname, './migrations'),
        path.resolve(process.cwd(), 'migrations'),
    ];

    return candidates.find(hasMigrationJournal) ?? candidates[0];
}

// Preserves applied migration history when upgrading local PGlite stores from the legacy single ledger.
async function syncLegacyMigrationLedger(db: PgliteDatabase<typeof schema>): Promise<void> {
    if (typeof db.execute !== 'function') {
        return;
    }

    await db.execute(sql`
        DO $$
        BEGIN
            IF to_regclass('drizzle.__drizzle_migrations') IS NOT NULL
               AND to_regclass('drizzle.__drizzle_migrations_core') IS NULL THEN
                CREATE SCHEMA IF NOT EXISTS "drizzle";
                CREATE TABLE "drizzle"."__drizzle_migrations_core" AS
                TABLE "drizzle"."__drizzle_migrations";
            END IF;
        END $$;
    `);
}

/**
 * Executes pending database migrations against the initialized PGlite client.
 * @param db The Drizzle PGlite database instance.
 */
export async function runMigrations(db: PgliteDatabase<typeof schema>) {
    getCoreLogger().info('Checking and running application migrations...');

    try {
        const start = Date.now();
        const migrationDir = resolveMigrationsFolder();
        await syncLegacyMigrationLedger(db);
        await migrate(db, {
            migrationsFolder: migrationDir,
            migrationsTable: CORE_MIGRATIONS_TABLE,
        });

        const end = Date.now();
        getCoreLogger().info(`Migrations checked/applied successfully in ${end - start} ms.`);
    } catch (error) {
        getCoreLogger().error('FATAL: Database migration failed during application startup.', error);
        throw new Error('Database initialization failed due to migration error.');
    }
}
