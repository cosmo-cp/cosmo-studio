import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { DatabaseManager } from '../database/DatabaseManager';
import { guardrailsConfig } from '../database/schema/guardrailsConfigSchema';
import type { GuardrailsConfigSaveInput } from '../dto';
import { createTestDb, type TestDb } from '../test-utils/testDb';
import { GuardrailsConfigRepository } from './GuardrailsConfigRepository';

describe('GuardrailsConfigRepository', () => {
    let testDb: TestDb;
    let repository: GuardrailsConfigRepository;

    const baseInput: GuardrailsConfigSaveInput = {
        enabled: true,
        injectionEnabled: true,
        injectionMode: 'heuristic',
        injectionThreshold: 0.7,
        leakageEnabled: true,
        leakageMode: 'heuristic',
        leakageThreshold: 0.7,
        piiEnabled: true,
        piiMode: 'redact',
        secretEnabled: true,
        secretMode: 'block',
    };

    beforeAll(async () => {
        testDb = await createTestDb();
        const databaseManager = {
            getInstance: () => {
                return testDb.db;
            },
        } as unknown as DatabaseManager;
        repository = new GuardrailsConfigRepository(databaseManager);
    });

    afterAll(async () => {
        await testDb.close();
    });

    beforeEach(async () => {
        await testDb.db.delete(guardrailsConfig);
    });

    it('returns undefined when no config is stored', async () => {
        const result = await repository.get();
        expect(result).toBeUndefined();
    });

    it('creates a new config when none exists and updates when one exists', async () => {
        const created = await repository.save(baseInput);
        expect(created.id).toBeDefined();
        expect(created.enabled).toBe(true);
        expect(created.injectionMode).toBe('heuristic');
        expect(created.secretMode).toBe('block');

        const fetched = await repository.get();
        expect(fetched?.id).toBe(created.id);
        expect(fetched?.injectionMode).toBe('heuristic');

        const updated = await repository.save({
            ...baseInput,
            injectionMode: 'pattern',
            injectionThreshold: 0.85,
            secretMode: 'redact',
        });
        expect(updated.id).toBe(created.id);
        expect(updated.injectionMode).toBe('pattern');
        expect(updated.injectionThreshold).toBe(0.85);
        expect(updated.secretMode).toBe('redact');
        expect(updated.updatedAt).toBeDefined();

        const fetchedAfterUpdate = await repository.get();
        expect(fetchedAfterUpdate?.id).toBe(created.id);
        expect(fetchedAfterUpdate?.injectionMode).toBe('pattern');
        expect(fetchedAfterUpdate?.secretMode).toBe('redact');
    });
});
