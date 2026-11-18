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

    it('creates and retrieves a rich persona with intelligence, skills, and tool permissions', async () => {
        const rich = await repository.create({
            name: 'Architect',
            role: 'Enterprise Architect',
            description: 'Designs enterprise grade systems',
            details: 'Follow standard architecture playbooks.',
            systemPrompt: 'Follow standard architecture playbooks.',
            modelIdentifier: 'anthropic:claude-3-7-sonnet',
            temperature: 0.7,
            reasoningEffort: 'high',
            skills: ['egm-bootstrap', 'run-workflow'],
            toolAccessMode: 'custom',
            allowedMcpServers: ['github', 'filesystem'],
            allowedTools: ['read_file', 'write_file'],
            webSearchEnabled: true,
        } as unknown as NewPersona);

        expect(rich.id).toBeDefined();
        expect(rich.name).toBe('Architect');
        expect(rich.role).toBe('Enterprise Architect');
        expect(rich.skills).toEqual(['egm-bootstrap', 'run-workflow']);
        expect(rich.toolAccessMode).toBe('custom');
        expect(rich.allowedMcpServers).toEqual(['github', 'filesystem']);
        expect(rich.allowedTools).toEqual(['read_file', 'write_file']);
        expect(rich.webSearchEnabled).toBe(true);
        expect(rich.temperature).toBeCloseTo(0.7);

        const fetched = await repository.getById(rich.id);
        expect(fetched).toBeDefined();
        expect(fetched?.role).toBe('Enterprise Architect');
        expect(fetched?.skills).toEqual(['egm-bootstrap', 'run-workflow']);
    });
});
