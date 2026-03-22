import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { chat, message } from '../database/schema/schema';
import type { DatabaseManager } from '../database/DatabaseManager';
import type { NewChat } from '../dto';
import { createTestDb, type TestDb } from '../test-utils/testDb';
import { ChatRepository } from './ChatRepository';

describe('ChatRepository', () => {
    let testDb: TestDb;
    let repository: ChatRepository;

    beforeAll(async () => {
        testDb = await createTestDb();
        const databaseManager = {
            getInstance: () => testDb.db,
        } as unknown as DatabaseManager;
        repository = new ChatRepository(databaseManager);
    });

    afterAll(async () => {
        await testDb.close();
    });

    beforeEach(async () => {
        vi.useRealTimers();
        await testDb.db.delete(message);
        await testDb.db.delete(chat);
    });

    it('creates a new chat and marks it as selected', async () => {
        await testDb.db.insert(chat).values({
            id: '00000000-0000-0000-0000-00000000d001',
            title: 'Old',
            selected: true,
        });

        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
        await repository.create({ title: 'New' } as unknown as NewChat);

        const rows = await testDb.db.select().from(chat);
        const selected = rows.filter((c) => c.selected);
        expect(selected).toHaveLength(1);
        expect(selected[0].title).toBe('New');
        expect(rows.find((c) => c.title === 'Old')?.selected).toBe(false);
    });

    it('filters chats by search query and orders pinned chats first', async () => {
        await testDb.db.insert(chat).values([
            {
                id: '00000000-0000-0000-0000-00000000d010',
                title: 'Cosmo One',
                selected: false,
                pinned: false,
                lastMessageAt: new Date('2024-01-01T00:00:00Z'),
            },
            {
                id: '00000000-0000-0000-0000-00000000d011',
                title: 'Other',
                selected: false,
                pinned: false,
                lastMessageAt: new Date('2024-01-01T00:00:20Z'),
            },
            {
                id: '00000000-0000-0000-0000-00000000d012',
                title: 'Cosmo Two',
                selected: false,
                pinned: true,
                pinnedAt: new Date('2024-01-01T00:01:00Z'),
                lastMessageAt: new Date('2024-01-01T00:00:10Z'),
            },
        ]);

        const matches = await repository.getAll('  cosmo  ');
        expect(matches).toHaveLength(2);
        expect(matches[0].title).toBe('Cosmo Two');
        expect(matches.map((c) => c.title)).toEqual(['Cosmo Two', 'Cosmo One']);

        const all = await repository.getAll(null);
        expect(all.map((c) => c.title)).toEqual(['Cosmo Two', 'Other', 'Cosmo One']);
    });

    it('updates pinned status and pinnedAt', async () => {
        const id = '00000000-0000-0000-0000-00000000d020';
        await testDb.db.insert(chat).values({ id, title: 'Pinned', selected: false });

        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
        await repository.updatePinnedStatus(id, true);

        const [pinned] = await testDb.db.select().from(chat).where(eq(chat.id, id)).limit(1);
        expect(pinned.pinned).toBe(true);
        expect(new Date(pinned.pinnedAt as unknown as Date).toISOString()).toBe('2024-01-01T00:00:00.000Z');

        await repository.updatePinnedStatus(id, false);
        const [unpinned] = await testDb.db.select().from(chat).where(eq(chat.id, id)).limit(1);
        expect(unpinned.pinned).toBe(false);
        expect(unpinned.pinnedAt).toBeNull();
    });

    it('updates selected chat, model, and persona fields', async () => {
        const a = '00000000-0000-0000-0000-00000000d030';
        const b = '00000000-0000-0000-0000-00000000d031';
        await testDb.db.insert(chat).values([
            { id: a, title: 'A', selected: true },
            { id: b, title: 'B', selected: false },
        ]);

        await repository.updateSelectedChat(b);
        const rowA = await testDb.db.select().from(chat).where(eq(chat.id, a)).limit(1);
        const rowB = await testDb.db.select().from(chat).where(eq(chat.id, b)).limit(1);
        expect(rowA[0].selected).toBe(false);
        expect(rowB[0].selected).toBe(true);

        await repository.updateSelectedModelForChatId(b, {
            selectedProvider: 'openai',
            selectedModelId: 'gpt-4',
        });
        await expect(repository.getSelectedModelForChatId(b)).resolves.toBe('gpt-4');
        await expect(repository.getSelectedModelForChatId('00000000-0000-0000-0000-00000000d999')).resolves.toBeNull();

        await repository.updateSelectedPersonaForChatId(b, {
            selectedPersonaId: '00000000-0000-0000-0000-00000000d099',
        });
        const [updated] = await testDb.db.select().from(chat).where(eq(chat.id, b)).limit(1);
        expect(updated.selectedProvider).toBe('openai');
        expect(updated.selectedModelId).toBe('gpt-4');
        expect(updated.selectedPersonaId).toBe('00000000-0000-0000-0000-00000000d099');
    });

    it('returns chats with UIMessage-converted messages ordered by createdAt', async () => {
        const id = '00000000-0000-0000-0000-00000000d040';
        await testDb.db.insert(chat).values({ id, title: 'Chat', selected: false });
        await testDb.db.insert(message).values([
            {
                id: '00000000-0000-0000-0000-00000000e001',
                chatId: id,
                role: 'user',
                text: 'hello',
                reasoning: null,
                createdAt: new Date('2024-01-01T00:00:10Z'),
            },
            {
                id: '00000000-0000-0000-0000-00000000e002',
                chatId: id,
                role: 'assistant',
                text: 'answer',
                reasoning: 'steps',
                modelIdentifier: 'google:gemini-flash-lite-latest',
                createdAt: new Date('2024-01-01T00:00:20Z'),
            },
        ]);

        const result = await repository.getById(id);
        expect(result?.id).toBe(id);
        expect(result?.messages).toEqual([
            { id: '00000000-0000-0000-0000-00000000e001', role: 'user', parts: [{ type: 'text', text: 'hello' }] },
            {
                id: '00000000-0000-0000-0000-00000000e002',
                role: 'assistant',
                parts: [
                    { type: 'text', text: 'answer' },
                    { type: 'reasoning', text: 'steps' },
                ],
                metadata: { modelId: 'google:gemini-flash-lite-latest' },
            },
        ]);

        await expect(repository.getById('00000000-0000-0000-0000-00000000d999')).resolves.toBeUndefined();
    });

    it('updates and deletes chats', async () => {
        const id = '00000000-0000-0000-0000-00000000d050';
        await testDb.db.insert(chat).values({ id, title: 'Before', selected: false });

        const updated = await repository.update(id, { title: 'After' } as Partial<NewChat>);
        expect(updated.title).toBe('After');

        await repository.delete(id);
        const remaining = await testDb.db.select().from(chat).where(eq(chat.id, id));
        expect(remaining).toEqual([]);
    });
});
