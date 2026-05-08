import { PGlite } from '@electric-sql/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { drizzle, type PgliteDatabase } from 'drizzle-orm/pglite';
import path from 'path';
import * as schema from '../database/schema/schema';

export type TestDb = {
    db: PgliteDatabase<typeof schema>;
    close: () => Promise<void>;
};

/**
 * Creates an isolated migrated database for repository tests without filesystem overhead.
 */
export async function createTestDb(): Promise<TestDb> {
    const connection = await PGlite.create('memory://');
    const db = drizzle(connection, { schema });

    await migrate(db, { migrationsFolder: path.resolve(__dirname, '../../../migrations') });

    return {
        db,
        close: async () => {
            await connection.close();
        },
    };
}
