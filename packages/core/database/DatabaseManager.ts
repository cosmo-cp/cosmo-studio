import fs from 'fs';
import path from 'path';
import { PGlite } from '@electric-sql/pglite';
import { drizzle, PgliteDatabase } from 'drizzle-orm/pglite';
import { injectable } from 'inversify';
import { getCoreLogger } from '../platform/CoreLogger';
import { runMigrations } from './migrator';
import * as schema from './schema/schema';

@injectable()
export class DatabaseManager {
    private static instance: PgliteDatabase<typeof schema> | null = null;
    private static initPromise: Promise<void> | null = null;
    private static readonly PGLITE_INIT_FAILURE_MESSAGE = 'PGlite failed to initialize properly';

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

    /**
     * Clears stale embedded Postgres lock state so crashed dev sessions do not block restart.
     */
    private static removeStalePostmasterPid(absoluteDbPath: string): void {
        const postmasterPidPath = path.join(absoluteDbPath, 'postmaster.pid');
        if (!fs.existsSync(postmasterPidPath)) {
            return;
        }

        const firstLine = fs.readFileSync(postmasterPidPath, 'utf8').split('\n', 1)[0]?.trim() ?? '';
        const pid = Number.parseInt(firstLine, 10);

        if (Number.isInteger(pid) && pid > 0) {
            try {
                process.kill(pid, 0);
                throw new Error(`PGlite database directory is already in use by process ${pid}.`);
            } catch (error) {
                const code = (error as NodeJS.ErrnoException).code;
                if (code !== 'ESRCH') {
                    throw error;
                }
            }
        }

        fs.rmSync(postmasterPidPath, { force: true });
        getCoreLogger().warn(`[DB INIT] Removed stale PGlite lock file at ${postmasterPidPath}`);
    }

    /**
     * Moves unreadable database files aside so the app can recreate a fresh local store.
     */
    private static quarantineCorruptedDatabase(absoluteDbPath: string): string {
        const backupPath = `${absoluteDbPath}.corrupt-${Date.now()}`;
        fs.renameSync(absoluteDbPath, backupPath);
        getCoreLogger().warn(
            `[DB INIT] Moved unreadable PGlite data directory from ${absoluteDbPath} to ${backupPath}.`,
        );
        return backupPath;
    }

    /**
     * Retries startup once when persisted PGlite files are unreadable but recoverable by recreation.
     */
    private static shouldRetryWithFreshDatabase(absoluteDbPath: string, error: unknown): boolean {
        if (!(error instanceof Error) || error.message !== this.PGLITE_INIT_FAILURE_MESSAGE) {
            return false;
        }

        if (!fs.existsSync(absoluteDbPath)) {
            return false;
        }

        return fs.readdirSync(absoluteDbPath).length > 0;
    }

    /**
     * Opens the embedded Postgres data directory and runs the shared schema migrations.
     */
    private static async openDatabase(absoluteDbPath: string): Promise<void> {
        this.removeStalePostmasterPid(absoluteDbPath);
        const connection = await PGlite.create(absoluteDbPath);
        this.instance = drizzle(connection, { schema: schema });
        getCoreLogger().info('[DB INIT] Drizzle client successfully initialized.');

        await runMigrations(this.instance);
    }

    private static async createInstance(absoluteDbPath: string): Promise<void> {
        try {
            getCoreLogger().info(`[DB INIT] Attempting to connect PGlite to absolute path: ${absoluteDbPath}`);
            try {
                await this.openDatabase(absoluteDbPath);
            } catch (error) {
                if (!this.shouldRetryWithFreshDatabase(absoluteDbPath, error)) {
                    throw error;
                }

                this.quarantineCorruptedDatabase(absoluteDbPath);
                await this.openDatabase(absoluteDbPath);
            }
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
            throw new Error(
                'Database not initialized. Call and await DatabaseManager.initialize() at application startup.',
            );
        }
        return DatabaseManager.instance;
    }
}
