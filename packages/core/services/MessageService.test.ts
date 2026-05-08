import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Message, NewMessage } from '../dto';
import type { MessageRepository } from '../repositories/MessageRepository';
import { MessageService } from './MessageService';

describe('MessageService', () => {
    let repository: MessageRepository;
    let service: MessageService;

    beforeEach(() => {
        repository = {
            getMessagesByChatId: vi.fn(),
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
});
