import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatMessageSyncInput, Message, NewMessage } from '../dto';
import type { UIMessage } from 'ai';
import type { MessageRepository } from '../repositories/MessageRepository';
import { MessageService } from './MessageService';

describe('MessageService', () => {
    let repository: MessageRepository;
    let service: MessageService;

    beforeEach(() => {
        repository = {
            getMessagesByChatId: vi.fn(),
            syncForChat: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        } as unknown as MessageRepository;
        service = new MessageService(repository);
    });

    it('converts stored messages to UIMessage parts', async () => {
        const now = new Date();
        const messages: Message[] = [
            {
                id: 't',
                chatId: 'c',
                role: 'user',
                text: 'hello',
                reasoning: null,
                createdAt: now,
            } as unknown as Message,
            {
                id: 'r',
                chatId: 'c',
                role: 'assistant',
                text: null,
                reasoning: 'thinking',
                modelIdentifier: 'openai:gpt-4o',
                createdAt: now,
            } as unknown as Message,
            {
                id: 'both',
                chatId: 'c',
                role: 'assistant',
                text: 'answer',
                reasoning: 'steps',
                createdAt: now,
            } as unknown as Message,
            {
                id: 'empty',
                chatId: 'c',
                role: 'system',
                text: null,
                reasoning: null,
                createdAt: now,
            } as unknown as Message,
        ];
        (repository.getMessagesByChatId as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(messages);

        const uiMessages = await service.getMessagesByChatId('c');

        expect(repository.getMessagesByChatId).toHaveBeenCalledWith('c');
        expect(uiMessages).toEqual([
            { id: 't', role: 'user', parts: [{ type: 'text', text: 'hello' }] },
            {
                id: 'r',
                role: 'assistant',
                parts: [{ type: 'reasoning', text: 'thinking' }],
                metadata: { modelId: 'openai:gpt-4o' },
            },
            {
                id: 'both',
                role: 'assistant',
                parts: [
                    { type: 'text', text: 'answer' },
                    { type: 'reasoning', text: 'steps' },
                ],
            },
            { id: 'empty', role: 'system', parts: [] },
        ]);
    });

    it('returns serialized UI messages when present', async () => {
        const uiMessage: UIMessage = {
            id: 'client-id',
            role: 'assistant',
            parts: [{ type: 'text', text: 'serialized' }],
        };
        (repository.getMessagesByChatId as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
            {
                id: 'db-id',
                chatId: 'c',
                role: 'assistant',
                text: 'legacy text',
                reasoning: null,
                uiMessage,
                createdAt: new Date(),
            } as unknown as Message,
        ]);

        await expect(service.getMessagesByChatId('c')).resolves.toEqual([uiMessage]);
    });

    it('delegates create/update/delete to the repository', async () => {
        const created = { id: 'm' } as unknown as Message;
        const updated = { id: 'm' } as unknown as Message;
        (repository.create as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(created);
        (repository.update as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(updated);

        const newMessage: NewMessage = {
            chatId: 'c',
            role: 'user',
            text: 'hi',
            reasoning: null,
        } as unknown as NewMessage;

        await expect(service.createMessage(newMessage)).resolves.toEqual(created);
        expect(repository.create).toHaveBeenCalledWith(newMessage);

        await expect(service.updateMessage('m', { text: 'updated' } as Partial<NewMessage>)).resolves.toEqual(updated);
        expect(repository.update).toHaveBeenCalledWith('m', { text: 'updated' });

        await service.deleteMessage('m');
        expect(repository.delete).toHaveBeenCalledWith('m');
    });

    it('delegates chat message sync to the repository', async () => {
        const input: ChatMessageSyncInput = {
            chatId: '00000000-0000-4000-8000-000000000001',
            sequence: 1,
            messages: [],
        };
        const ack = { chatId: input.chatId, sequence: 1, accepted: true };
        (repository.syncForChat as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(ack);

        await expect(service.syncForChat(input)).resolves.toEqual(ack);
        expect(repository.syncForChat).toHaveBeenCalledWith(input);
    });
});
