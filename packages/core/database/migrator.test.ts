import path from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setCoreLogger } from '../platform/CoreLogger';
import { CORE_MIGRATIONS_TABLE, runMigrations } from './migrator';

const migrateMock = vi.hoisted(() => {
    return vi.fn();
});
const logger = vi.hoisted(() => {
    return {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    };
});

vi.mock('drizzle-orm/pglite/migrator', () => {
    return {
        migrate: migrateMock,
    };
});

describe('runMigrations', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        setCoreLogger(logger);
    });

    it('runs core migrations from the expected folder and logs timing', async () => {
        migrateMock.mockResolvedValue(undefined);
        const executeMock = vi.fn().mockResolvedValue(undefined);
        const nowSpy = vi.spyOn(Date, 'now');
        nowSpy.mockReturnValueOnce(100).mockReturnValueOnce(160);

        await runMigrations({ execute: executeMock } as never);

        const expectedDir = path.resolve(process.cwd(), 'migrations/core');
        expect(executeMock).toHaveBeenCalledTimes(1);
        expect(migrateMock).toHaveBeenCalledWith(expect.anything(), {
            migrationsFolder: expectedDir,
            migrationsTable: CORE_MIGRATIONS_TABLE,
        });
        expect(logger.info).toHaveBeenCalledWith('Checking and running application migrations...');
        expect(logger.info).toHaveBeenCalledWith('Migrations checked/applied successfully in 60 ms.');

        nowSpy.mockRestore();
    });

    it('skips ledger sync when client execute is unavailable and wraps migration failures', async () => {
        migrateMock.mockRejectedValue(new Error('migrate failed'));

        await expect(runMigrations({} as never)).rejects.toThrow(
            'Database initialization failed due to migration error.',
        );
        expect(logger.error).toHaveBeenCalledWith(
            'FATAL: Database migration failed during application startup.',
            expect.any(Error),
        );
    });
});
