import fs from 'fs';
import path from 'path';
import { PgliteDatabase } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { getCoreLogger } from '../platform/CoreLogger';
import * as schema from './schema/schema';

function hasMigrationJournal(migrationDir: string): boolean {
    return fs.existsSync(path.join(migrationDir, 'meta', '_journal.json'));
}

function resolveMigrationsFolder(): string {
    const candidates = [path.resolve(__dirname, './migrations'), path.resolve(process.cwd(), 'migrations')];

    return candidates.find(hasMigrationJournal) ?? candidates[0];
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
        await migrate(db, { migrationsFolder: migrationDir });

        const end = Date.now();
        getCoreLogger().info(`Migrations checked/applied successfully in ${end - start} ms.`);
    } catch (error) {
        getCoreLogger().error('FATAL: Database migration failed during application startup.', error);
        throw new Error('Database initialization failed due to migration error.');
    }
}
