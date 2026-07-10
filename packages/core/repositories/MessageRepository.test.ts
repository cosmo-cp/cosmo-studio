import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { chat, message } from '../database/schema/schema';
import type { DatabaseManager } from '../database/DatabaseManager';
import type { NewMessage } from '../dto';
import type { UIMessage } from 'ai';
import { createTestDb, type TestDb } from '../test-utils/testDb';
import { MessageRepository } from './MessageRepository';

describe('MessageRepository', () => {
    let testDb: TestDb;
    let repository: MessageRepository;

    const chatId = '00000000-0000-0000-0000-00000000c001';

    beforeAll(async () => {
        testDb = await createTestDb();
        const databaseManager = {
            getInstance: () => testDb.db,
        } as unknown as DatabaseManager;
        repository = new MessageRepository(databaseManager);
    });

    afterAll(async () => {
        await testDb.close();
    });

    beforeEach(async () => {
        vi.useRealTimers();
        await testDb.db.delete(message);
        await testDb.db.delete(chat);
        await testDb.db.insert(chat).values({
            id: chatId,
            title: 'Initial title',
            selected: true,
        });
    });

    it('creates messages and updates chat title/lastMessage for the first message only', async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));

        const longText = 'x'.repeat(250);
        const created1 = await repository.create({
            chatId,
            role: 'user',
            text: longText,
            reasoning: null,
        } as unknown as NewMessage);

        const [chatAfterFirst] = await testDb.db.select().from(chat).where(eq(chat.id, chatId)).limit(1);
        expect(chatAfterFirst.title).toBe(longText.slice(0, 50));
        expect(chatAfterFirst.lastMessage).toBe(longText.slice(0, 200));
        expect(new Date(chatAfterFirst.lastMessageAt as unknown as Date).toISOString()).toBe(
            '2024-01-01T00:00:00.000Z',
        );

        vi.setSystemTime(new Date('2024-01-01T00:00:10Z'));
        const created2 = await repository.create({
            chatId,
            role: 'user',
            text: 'second',
            reasoning: null,
        } as unknown as NewMessage);

        const [chatAfterSecond] = await testDb.db.select().from(chat).where(eq(chat.id, chatId)).limit(1);
        expect(chatAfterSecond.title).toBe(longText.slice(0, 50));
        expect(chatAfterSecond.lastMessage).toBe('second');
        expect(new Date(chatAfterSecond.lastMessageAt as unknown as Date).toISOString()).toBe(
            '2024-01-01T00:00:10.000Z',
        );

        const messages = await repository.getMessagesByChatId(chatId);
        expect(messages.map((m) => m.id)).toEqual([created1.id, created2.id]);

        const updated = await repository.update(created2.id, { text: 'updated' });
        expect(updated.text).toBe('updated');

        await repository.delete(created1.id);
        const remaining = await repository.getMessagesByChatId(chatId);
        expect(remaining.map((m) => m.id)).toEqual([created2.id]);
    });

    it('persists reasoning-only assistant messages without clearing chat previews', async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));

        await repository.create({
            chatId,
            role: 'user',
            text: 'hello',
            reasoning: null,
        } as unknown as NewMessage);

        vi.setSystemTime(new Date('2024-01-01T00:00:10Z'));
        const created = await repository.create({
            chatId,
            role: 'assistant',
            text: null,
            reasoning: 'tool planning only',
            modelIdentifier: 'provider:model',
        } as unknown as NewMessage);

        expect(created.text).toBeNull();
        expect(created.reasoning).toBe('tool planning only');
        expect(created.modelIdentifier).toBe('provider:model');

        const [updatedChat] = await testDb.db.select().from(chat).where(eq(chat.id, chatId)).limit(1);
        expect(updatedChat.title).toBe('hello');
        expect(updatedChat.lastMessage).toBe('hello');
        expect(new Date(updatedChat.lastMessageAt as unknown as Date).toISOString()).toBe(
            '2024-01-01T00:00:10.000Z',
        );
    });

    it('syncs serialized UI messages and rejects stale snapshots', async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
        await testDb.db.update(chat).set({ title: 'New Chat' }).where(eq(chat.id, chatId));

        const uiMessages: UIMessage[] = [
            {
                id: 'client-user',
                role: 'user',
                parts: [{ type: 'text', text: 'hello from redux' }],
            },
            {
                id: 'client-assistant',
                role: 'assistant',
                parts: [
                    { type: 'reasoning', text: 'thinking' },
                    { type: 'text', text: 'assistant answer' },
                ],
                metadata: { modelId: 'provider:model' },
            },
        ];

        await expect(repository.syncForChat({ chatId, sequence: 1, messages: uiMessages })).resolves.toEqual({
            chatId,
            sequence: 1,
            accepted: true,
        });

        const syncedMessages = await repository.getMessagesByChatId(chatId);
        expect(syncedMessages).toHaveLength(2);
        expect(syncedMessages[0].uiMessage).toEqual(uiMessages[0]);
        expect(syncedMessages[1].uiMessage).toEqual(uiMessages[1]);
        expect(syncedMessages[1].modelIdentifier).toBe('provider:model');

        const [updatedChat] = await testDb.db.select().from(chat).where(eq(chat.id, chatId)).limit(1);
        expect(updatedChat.syncVersion).toBe(1);
        expect(updatedChat.title).toBe('hello from redux');
        expect(updatedChat.lastMessage).toBe('assistant answer');

        await expect(repository.syncForChat({ chatId, sequence: 1, messages: [] })).resolves.toEqual({
            chatId,
            sequence: 1,
            accepted: false,
        });
        await expect(repository.getMessagesByChatId(chatId)).resolves.toHaveLength(2);
    });
});
