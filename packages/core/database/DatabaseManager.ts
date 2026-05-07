import {PGlite} from '@electric-sql/pglite';
import {drizzle, PgliteDatabase} from 'drizzle-orm/pglite';
import * as schema from './schema/schema';
import {injectable} from 'inversify';
import {runMigrations} from './migrator';
import {getCoreLogger} from "../platform/CoreLogger";

@injectable()
export class DatabaseManager {
    private static instance: PgliteDatabase<typeof schema> | null = null;
    private static initPromise: Promise<void> | null = null;

    /**
     * Initializes the database connection and runs migrations.
     * This must be called once at application startup.
     * @param absoluteDbPath The absolute path to the database file.
     */
    public static initialize(absoluteDbPath: string): Promise<void> {
        if (!this.initPromise) {
            this.initPromise = this.createInstance(absoluteDbPath);
        }
        return this.initPromise;
    }

    private static async createInstance(absoluteDbPath: string): Promise<void> {
        try {
            getCoreLogger().info(`[DB INIT] Attempting to connect PGlite to absolute path: ${absoluteDbPath}`);
            const connection = await PGlite.create(absoluteDbPath);
            this.instance = drizzle(connection, {schema});
            getCoreLogger().info('[DB INIT] Drizzle client successfully initialized.');

            // Run migrations automatically after initialization
            await runMigrations(this.instance);

        } catch (error) {
            getCoreLogger().error('[DB INIT] Failed to initialize database client and run migrations:', error);
            this.initPromise = null; // Allow initialization to be re-attempted
            throw error;
        }
    }

    /**
     * Synchronously gets the database instance.
     * Ensure that initialize() has been called and awaited first.
     */
    public getInstance(): PgliteDatabase<typeof schema> {
        if (!DatabaseManager.instance) {
            throw new Error('Database not initialized. Call and await DatabaseManager.initialize() at application startup.');
        }
        return DatabaseManager.instance;
    }
}
