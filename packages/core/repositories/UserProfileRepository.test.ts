import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { DatabaseManager } from '../database/DatabaseManager';
import { userProfile } from '../database/schema/schema';
import { createTestDb, type TestDb } from '../test-utils/testDb';
import { UserProfileRepository } from './UserProfileRepository';

describe('UserProfileRepository', () => {
    let testDb: TestDb;
    let repository: UserProfileRepository;

    beforeAll(async () => {
        testDb = await createTestDb();
        const databaseManager = {
            getInstance: () => {
                return testDb.db;
            },
        } as unknown as DatabaseManager;
        repository = new UserProfileRepository(databaseManager);
    });

    afterAll(async () => {
        await testDb.close();
    });

    beforeEach(async () => {
        await testDb.db.delete(userProfile);
    });

    it('returns undefined when no profile is saved', async () => {
        const result = await repository.get();
        expect(result).toBeUndefined();
    });

    it('creates a new profile with photo when none exists and updates when one exists', async () => {
        const created = await repository.save('Gaurav', 'data:image/png;base64,abc');
        expect(created.name).toBe('Gaurav');
        expect(created.photo).toBe('data:image/png;base64,abc');
        expect(created.id).toBeDefined();

        const fetched = await repository.get();
        expect(fetched?.name).toBe('Gaurav');
        expect(fetched?.photo).toBe('data:image/png;base64,abc');
        expect(fetched?.id).toBe(created.id);

        const updated = await repository.save('Gaurav Saini', 'data:image/png;base64,xyz');
        expect(updated.name).toBe('Gaurav Saini');
        expect(updated.photo).toBe('data:image/png;base64,xyz');
        expect(updated.id).toBe(created.id);

        const fetchedAfterUpdate = await repository.get();
        expect(fetchedAfterUpdate?.name).toBe('Gaurav Saini');
        expect(fetchedAfterUpdate?.photo).toBe('data:image/png;base64,xyz');
    });
});
