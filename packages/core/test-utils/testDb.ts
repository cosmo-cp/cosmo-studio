import { PGlite } from '@electric-sql/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { drizzle, type PgliteDatabase } from 'drizzle-orm/pglite';
import fs from 'fs';
import os from 'os';
import path from 'path';
import * as schema from '../database/schema/schema';

export type TestDb = {
    db: PgliteDatabase<typeof schema>;
    close: () => Promise<void>;
};

export async function createTestDb(): Promise<TestDb> {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cosmo-test-db-'));
    const dbPath = path.join(dir, 'db');

    const connection = await PGlite.create(dbPath);
    const db = drizzle(connection, { schema });

    await migrate(db, { migrationsFolder: path.resolve(__dirname, '../../../migrations') });

    return {
        db,
        close: async () => {
            await connection.close();
            fs.rmSync(dir, { recursive: true, force: true });
        },
    };
}
