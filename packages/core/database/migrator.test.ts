import path from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setCoreLogger } from '../platform/CoreLogger';
import { runMigrations } from './migrator';

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

vi.mock('../../../src/main/logger', () => {
    return {
        logger: logger,
    };
});

describe('runMigrations', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        setCoreLogger(logger);
    });

    it('runs migrations from the expected folder and logs timing', async () => {
        migrateMock.mockResolvedValue(undefined);
        const nowSpy = vi.spyOn(Date, 'now');
        nowSpy.mockReturnValueOnce(100).mockReturnValueOnce(160);

        await runMigrations({} as never);

        const expectedDir = path.resolve(process.cwd(), 'migrations');
        expect(migrateMock).toHaveBeenCalledWith(expect.anything(), { migrationsFolder: expectedDir });
        expect(logger.info).toHaveBeenCalledWith('Checking and running application migrations...');
        expect(logger.info).toHaveBeenCalledWith('Migrations checked/applied successfully in 60 ms.');

        nowSpy.mockRestore();
    });

    it('wraps migration failures with a startup-safe error', async () => {
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
