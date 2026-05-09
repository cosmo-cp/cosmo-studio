import { beforeEach, describe, expect, it, vi } from 'vitest';

const pgliteCreate = vi.hoisted(() => vi.fn());
const drizzleMock = vi.hoisted(() => vi.fn());
const runMigrationsMock = vi.hoisted(() => vi.fn());
const logger = vi.hoisted(() => ({
    info: vi.fn(),
    warn: vi.fn(),
  error: vi.fn(),
}));

vi.mock('@electric-sql/pglite', () => ({
    PGlite: {
        create: pgliteCreate,
    },
}));

vi.mock('drizzle-orm/pglite', () => ({
    drizzle: drizzleMock,
}));

vi.mock('./migrator', () => ({
    runMigrations: runMigrationsMock,
}));

vi.mock('../../../src/main/logger', () => ({
    logger,
}));

import {DatabaseManager} from "./DatabaseManager"
import {setCoreLogger} from "../platform/CoreLogger"

describe("DatabaseManager", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setCoreLogger(logger)
    ;(DatabaseManager as unknown as {instance: unknown; initPromise: unknown}).instance = null
    ;(DatabaseManager as unknown as {instance: unknown; initPromise: unknown}).initPromise = null
  })

    it('initializes drizzle once and exposes the instance', async () => {
        const connection = { connected: true };
        const db = { db: true };
        pgliteCreate.mockResolvedValue(connection);
        drizzleMock.mockReturnValue(db);
        runMigrationsMock.mockResolvedValue(undefined);

        await expect(DatabaseManager.initialize('/tmp/cosmo-db')).resolves.toBeUndefined();

        expect(pgliteCreate).toHaveBeenCalledWith('/tmp/cosmo-db');
        expect(drizzleMock).toHaveBeenCalledWith(connection, { schema: expect.any(Object) });
        expect(runMigrationsMock).toHaveBeenCalledWith(db);

        const manager = new DatabaseManager();
        expect(manager.getInstance()).toBe(db);
    });

    it('reuses the same initialization promise', async () => {
        pgliteCreate.mockResolvedValue({ connected: true });
        drizzleMock.mockReturnValue({ db: true });
        runMigrationsMock.mockResolvedValue(undefined);

        const promise1 = DatabaseManager.initialize('/tmp/first');
        const promise2 = DatabaseManager.initialize('/tmp/second');

        expect(promise2).toBe(promise1);
        await promise1;
        expect(pgliteCreate).toHaveBeenCalledTimes(1);
        expect(pgliteCreate).toHaveBeenCalledWith('/tmp/first');
    });

    it('resets initialization state on failure so it can be retried', async () => {
        pgliteCreate.mockRejectedValueOnce(new Error('boom'));

        await expect(DatabaseManager.initialize('/tmp/fail')).rejects.toThrow('boom');
        expect(logger.error).toHaveBeenCalled();

        pgliteCreate.mockResolvedValueOnce({ connected: true });
        drizzleMock.mockReturnValueOnce({ db: true });
        runMigrationsMock.mockResolvedValueOnce(undefined);

        await expect(DatabaseManager.initialize('/tmp/retry')).resolves.toBeUndefined();
        expect(pgliteCreate).toHaveBeenCalledTimes(2);
    });

    it('throws when accessed before initialization', () => {
        const manager = new DatabaseManager();
        expect(() => manager.getInstance()).toThrow(
            'Database not initialized. Call and await DatabaseManager.initialize() at application startup.',
        );
    });
});
