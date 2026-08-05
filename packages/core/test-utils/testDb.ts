import path from 'path';
import { PGlite } from '@electric-sql/pglite';
import { drizzle, type PgliteDatabase } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
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
    const db = drizzle(connection, { schema: schema });

    await migrate(db, { migrationsFolder: path.resolve(__dirname, '../../../migrations') });

    return {
        db: db,
        close: async () => {
            await connection.close();
        },
    };
}
