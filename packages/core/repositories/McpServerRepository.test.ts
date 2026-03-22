import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { mcpServer } from '../database/schema/schema';
import type { DatabaseManager } from '../database/DatabaseManager';
import type { McpServerInsert, McpServerUpdateInput } from '../dto';
import { createTestDb, type TestDb } from '../test-utils/testDb';
import { McpServerRepository } from './McpServerRepository';

describe('McpServerRepository', () => {
    let testDb: TestDb;
    let repository: McpServerRepository;

    beforeAll(async () => {
        testDb = await createTestDb();
        const databaseManager = {
            getInstance: () => testDb.db,
        } as unknown as DatabaseManager;
        repository = new McpServerRepository(databaseManager);
    });

    afterAll(async () => {
        await testDb.close();
    });

    beforeEach(async () => {
        vi.useRealTimers();
        await testDb.db.delete(mcpServer);
    });

    it('supports CRUD and enabled filtering', async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));

        const serverA = await repository.create({
            id: '00000000-0000-0000-0000-0000000000a1',
            name: 'B Server',
            description: null,
            transportType: 'sse',
            config: { url: 'https://b.example/sse' },
            enabled: false,
        } as unknown as McpServerInsert);

        const serverB = await repository.create({
            id: '00000000-0000-0000-0000-0000000000a2',
            name: 'A Server',
            description: null,
            transportType: 'http',
            config: { url: 'https://a.example/http' },
            enabled: true,
        } as unknown as McpServerInsert);

        const all = await repository.getAll();
        expect(all.map((s) => s.name)).toEqual(['A Server', 'B Server']);

        const enabled = await repository.getAllEnabled();
        expect(enabled).toHaveLength(1);
        expect(enabled[0].id).toBe(serverB.id);

        await expect(repository.getById(serverA.id)).resolves.toEqual(expect.objectContaining({ name: 'B Server' }));
        await expect(repository.getByName('A Server')).resolves.toEqual(expect.objectContaining({ id: serverB.id }));
        await expect(repository.getByName('Missing')).resolves.toBeUndefined();

        vi.setSystemTime(new Date('2024-01-02T00:00:00Z'));
        const updates: McpServerUpdateInput = { enabled: true, description: 'updated' };
        const updated = await repository.update(serverA.id, updates);
        expect(updated.enabled).toBe(true);
        expect(updated.description).toBe('updated');

        await repository.delete(serverA.id);
        const remaining = await testDb.db.select().from(mcpServer).where(eq(mcpServer.id, serverA.id));
        expect(remaining).toEqual([]);
    });
});
