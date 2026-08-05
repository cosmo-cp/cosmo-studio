import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DatabaseManager } from '../database/DatabaseManager';
import { persona } from '../database/schema/schema';
import type { NewPersona } from '../dto';
import { createTestDb, type TestDb } from '../test-utils/testDb';
import { PersonaRepository } from './PersonaRepository';

describe('PersonaRepository', () => {
    let testDb: TestDb;
    let repository: PersonaRepository;

    beforeAll(async () => {
        testDb = await createTestDb();
        const databaseManager = {
            getInstance: () => {
                return testDb.db;
            },
        } as unknown as DatabaseManager;
        repository = new PersonaRepository(databaseManager);
    });

    afterAll(async () => {
        await testDb.close();
    });

    beforeEach(async () => {
        vi.useRealTimers();
        await testDb.db.delete(persona);
    });

    it('creates, retrieves, updates, and deletes personas', async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));

        const created = await repository.create({
            id: '00000000-0000-0000-0000-000000000001',
            name: 'B',
            details: 'b',
        } as unknown as NewPersona);

        await repository.create({
            id: '00000000-0000-0000-0000-000000000002',
            name: 'A',
            details: 'a',
        } as unknown as NewPersona);

        const all = await repository.getAll();
        expect(
            all.map((p) => {
                return p.name;
            }),
        ).toEqual(['A', 'B']);

        await expect(repository.getById(created.id)).resolves.toEqual(expect.objectContaining({ name: 'B' }));
        await expect(repository.getByName('A')).resolves.toEqual(expect.objectContaining({ details: 'a' }));
        await expect(repository.getById('00000000-0000-0000-0000-000000000099')).resolves.toBeUndefined();

        vi.setSystemTime(new Date('2024-01-02T00:00:00Z'));
        const updated = await repository.update(created.id, { details: 'updated' });
        expect(updated.details).toBe('updated');
        expect(new Date(updated.updatedAt as unknown as Date).toISOString()).toBe('2024-01-02T00:00:00.000Z');

        await repository.delete(created.id);
        await expect(repository.getById(created.id)).resolves.toBeUndefined();

        const remaining = await testDb.db.select().from(persona).where(eq(persona.id, created.id));
        expect(remaining).toEqual([]);
    });
});
