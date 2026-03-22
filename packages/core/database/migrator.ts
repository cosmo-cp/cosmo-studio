import { migrate } from 'drizzle-orm/pglite/migrator';
import path from 'path';
import { PgliteDatabase } from 'drizzle-orm/pglite';
import * as schema from './schema/schema';
import { logger } from '../../../src/main/logger';

/**
 * Executes pending database migrations against the initialized PGlite client.
 * @param db The Drizzle PGlite database instance.
 */
export async function runMigrations(db: PgliteDatabase<typeof schema>) {
    logger.info('Checking and running application migrations...');

    try {
        const start = Date.now();
        // This assumes your migrations folder is in the same directory as your compiled migrator.js
        const migrationDir = path.resolve(__dirname, './migrations');
        await migrate(db, { migrationsFolder: migrationDir });

        const end = Date.now();
        logger.info(`Migrations checked/applied successfully in ${end - start} ms.`);
    } catch (error) {
        logger.error('FATAL: Database migration failed during application startup.', error);
        throw new Error('Database initialization failed due to migration error.');
    }
}
