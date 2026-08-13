import path from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setCoreLogger } from '../platform/CoreLogger';
import { DatabaseManager } from './DatabaseManager';

const pgliteCreate = vi.hoisted(() => {
    return vi.fn();
});
const drizzleMock = vi.hoisted(() => {
    return vi.fn();
});
const runMigrationsMock = vi.hoisted(() => {
    return vi.fn();
});
const fsExistsSyncMock = vi.hoisted(() => {
    return vi.fn();
});
const fsReadFileSyncMock = vi.hoisted(() => {
    return vi.fn();
});
const fsRmSyncMock = vi.hoisted(() => {
    return vi.fn();
});
const fsReaddirSyncMock = vi.hoisted(() => {
    return vi.fn();
});
const fsRenameSyncMock = vi.hoisted(() => {
    return vi.fn();
});
const logger = vi.hoisted(() => {
    return {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    };
});

vi.mock('@electric-sql/pglite', () => {
    return {
        PGlite: {
            create: pgliteCreate,
        },
    };
});

vi.mock('drizzle-orm/pglite', () => {
    return {
        drizzle: drizzleMock,
    };
});

vi.mock('fs', () => {
    const mockedFs = {
        existsSync: fsExistsSyncMock,
        readFileSync: fsReadFileSyncMock,
        rmSync: fsRmSyncMock,
        readdirSync: fsReaddirSyncMock,
        renameSync: fsRenameSyncMock,
    };
    return {
        default: mockedFs,
        ...mockedFs,
    };
});

vi.mock('./migrator', () => {
    return {
        runMigrations: runMigrationsMock,
    };
});

vi.mock('../../../src/main/logger', () => {
    return {
        logger: logger,
    };
});

describe('DatabaseManager', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        setCoreLogger(logger);
        (DatabaseManager as unknown as { instance: unknown; initPromise: unknown }).instance = null;
        (DatabaseManager as unknown as { instance: unknown; initPromise: unknown }).initPromise = null;
        fsExistsSyncMock.mockReturnValue(false);
        fsReaddirSyncMock.mockReturnValue([]);
    });

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

    it('removes a stale postmaster pid file before initializing', async () => {
        const connection = { connected: true };
        const db = { db: true };
        const dbPath = '/tmp/cosmo-db';
        const postmasterPidPath = path.join(dbPath, 'postmaster.pid');
        fsExistsSyncMock.mockReturnValue(true);
        fsReadFileSyncMock.mockReturnValue('-42\n/tmp/pglite/base\n');
        pgliteCreate.mockResolvedValue(connection);
        drizzleMock.mockReturnValue(db);
        runMigrationsMock.mockResolvedValue(undefined);

        await expect(DatabaseManager.initialize(dbPath)).resolves.toBeUndefined();

        expect(fsReadFileSyncMock).toHaveBeenCalledWith(postmasterPidPath, 'utf8');
        expect(fsRmSyncMock).toHaveBeenCalledWith(postmasterPidPath, { force: true });
        expect(logger.warn).toHaveBeenCalledWith(`[DB INIT] Removed stale PGlite lock file at ${postmasterPidPath}`);
    });

    it('fails fast when the database directory is already in use', async () => {
        const killSpy = vi.spyOn(process, 'kill').mockReturnValue(true);
        fsExistsSyncMock.mockReturnValue(true);
        fsReadFileSyncMock.mockReturnValue('12345\n/tmp/pglite/base\n');

        await expect(DatabaseManager.initialize('/tmp/busy-db')).rejects.toThrow(
            'PGlite database directory is already in use by process 12345.',
        );

        expect(fsRmSyncMock).not.toHaveBeenCalled();
        killSpy.mockRestore();
    });

    it('quarantines unreadable database files and retries initialization once', async () => {
        const connection = { connected: true };
        const db = { db: true };
        const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1234567890);

        fsExistsSyncMock.mockImplementation((targetPath: string) => {
            return targetPath === '/tmp/recover-db';
        });
        fsReaddirSyncMock.mockReturnValue(['PG_VERSION']);
        pgliteCreate
            .mockRejectedValueOnce(new Error('PGlite failed to initialize properly'))
            .mockResolvedValueOnce(connection);
        drizzleMock.mockReturnValue(db);
        runMigrationsMock.mockResolvedValue(undefined);

        await expect(DatabaseManager.initialize('/tmp/recover-db')).resolves.toBeUndefined();

        expect(fsRenameSyncMock).toHaveBeenCalledWith('/tmp/recover-db', '/tmp/recover-db.corrupt-1234567890');
        expect(pgliteCreate).toHaveBeenCalledTimes(2);
        expect(pgliteCreate).toHaveBeenNthCalledWith(1, '/tmp/recover-db');
        expect(pgliteCreate).toHaveBeenNthCalledWith(2, '/tmp/recover-db');
        expect(logger.warn).toHaveBeenCalledWith(
            '[DB INIT] Moved unreadable PGlite data directory from /tmp/recover-db to /tmp/recover-db.corrupt-1234567890.',
        );

        nowSpy.mockRestore();
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
        expect(() => {
            return manager.getInstance();
        }).toThrow('Database not initialized. Call and await DatabaseManager.initialize() at application startup.');
    });
});
