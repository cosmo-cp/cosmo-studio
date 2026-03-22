import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Chat, ChatWithMessages, ModelIdentifier, NewChat, PersonaIdentifier } from '../dto';
import type { ChatRepository } from '../repositories/ChatRepository';
import { ChatService } from './ChatService';

describe('ChatService', () => {
    let repository: ChatRepository;
    let service: ChatService;

    beforeEach(() => {
        repository = {
            getAll: vi.fn(),
            getById: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
            updatePinnedStatus: vi.fn(),
            getSelectedModelForChatId: vi.fn(),
            updateSelectedModelForChatId: vi.fn(),
            updateSelectedPersonaForChatId: vi.fn(),
            updateSelectedChat: vi.fn(),
        } as unknown as ChatRepository;
        service = new ChatService(repository);
    });

    it('delegates list and retrieval methods', async () => {
        const chats: Chat[] = [{ id: 'a' } as Chat];
        const withMessages: ChatWithMessages = { id: 'a', messages: [] } as ChatWithMessages;
        (repository.getAll as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(chats);
        (repository.getById as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(withMessages);
        (repository.getSelectedModelForChatId as unknown as ReturnType<typeof vi.fn>).mockResolvedValue('model-id');

        await expect(service.getAllChats(' query ')).resolves.toEqual(chats);
        expect(repository.getAll).toHaveBeenCalledWith(' query ');

        await expect(service.getChatById('a')).resolves.toEqual(withMessages);
        expect(repository.getById).toHaveBeenCalledWith('a');

        await expect(service.getSelectedModelForChat('a')).resolves.toBe('model-id');
        expect(repository.getSelectedModelForChatId).toHaveBeenCalledWith('a');
    });

    it('delegates mutations and selection updates', async () => {
        const updated: Chat = { id: 'a' } as Chat;
        (repository.update as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(updated);

        const newChat: NewChat = { title: 'Hello' } as NewChat;
        await service.createChat(newChat);
        expect(repository.create).toHaveBeenCalledWith(newChat);

        await expect(service.updateChat('a', { title: 'Updated' } as Partial<NewChat>)).resolves.toEqual(updated);
        expect(repository.update).toHaveBeenCalledWith('a', { title: 'Updated' });

        await service.deleteChat('a');
        expect(repository.delete).toHaveBeenCalledWith('a');

        await service.updatePinnedStatusForChat('a', true);
        expect(repository.updatePinnedStatus).toHaveBeenCalledWith('a', true);

        const modelIdentifier: ModelIdentifier = {
            selectedProvider: 'openai',
            selectedModelId: 'gpt-4',
        } as ModelIdentifier;
        await service.updateSelectedModelForChat('a', modelIdentifier);
        expect(repository.updateSelectedModelForChatId).toHaveBeenCalledWith('a', modelIdentifier);

        const personaIdentifier: PersonaIdentifier = { selectedPersonaId: 'p' } as PersonaIdentifier;
        await service.updateSelectedPersonaForChat('a', personaIdentifier);
        expect(repository.updateSelectedPersonaForChatId).toHaveBeenCalledWith('a', personaIdentifier);

        await service.updateSelectedChat('a');
        expect(repository.updateSelectedChat).toHaveBeenCalledWith('a');
    });
});
