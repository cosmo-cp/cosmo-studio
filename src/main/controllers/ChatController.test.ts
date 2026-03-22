import { describe, expect, it, vi } from 'vitest';
import type { Chat, ChatWithMessages, ModelIdentifier, NewChat, PersonaIdentifier } from 'core/dto';
import type { ChatService } from 'core/services/ChatService';
import { ChatController } from './ChatController';

describe('ChatController', () => {
    it('delegates all chat operations to the service', async () => {
        const chats: Chat[] = [{ id: 'c' } as Chat];
        const withMessages: ChatWithMessages = { id: 'c', messages: [] } as ChatWithMessages;
        const updated: Chat = { id: 'c' } as Chat;

        const service = {
            getAllChats: vi.fn().mockResolvedValue(chats),
            getChatById: vi.fn().mockResolvedValue(withMessages),
            createChat: vi.fn().mockResolvedValue(undefined),
            updateChat: vi.fn().mockResolvedValue(updated),
            deleteChat: vi.fn().mockResolvedValue(undefined),
            updatePinnedStatusForChat: vi.fn().mockResolvedValue(undefined),
            getSelectedModelForChat: vi.fn().mockResolvedValue('model-id'),
            updateSelectedModelForChat: vi.fn().mockResolvedValue(undefined),
            updateSelectedPersonaForChat: vi.fn().mockResolvedValue(undefined),
            updateSelectedChat: vi.fn().mockResolvedValue(undefined),
        } as unknown as ChatService;

        const controller = new ChatController(service);

        await expect(controller.getAllChats('q')).resolves.toEqual(chats);
        expect(service.getAllChats).toHaveBeenCalledWith('q');

        await expect(controller.getChatById('c')).resolves.toEqual(withMessages);
        expect(service.getChatById).toHaveBeenCalledWith('c');

        const newChat: NewChat = { title: 'Hello' } as NewChat;
        await controller.createChat(newChat);
        expect(service.createChat).toHaveBeenCalledWith(newChat);

        await expect(controller.updateChat('c', { title: 'Updated' } as Partial<NewChat>)).resolves.toEqual(updated);
        expect(service.updateChat).toHaveBeenCalledWith('c', { title: 'Updated' });

        await controller.deleteChat('c');
        expect(service.deleteChat).toHaveBeenCalledWith('c');

        await controller.updatePinnedStatusForChat('c', true);
        expect(service.updatePinnedStatusForChat).toHaveBeenCalledWith('c', true);

        await expect(controller.getSelectedModelForChat('c')).resolves.toBe('model-id');
        expect(service.getSelectedModelForChat).toHaveBeenCalledWith('c');

        const modelIdentifier: ModelIdentifier = {
            selectedProvider: 'openai',
            selectedModelId: 'gpt-4',
        } as ModelIdentifier;
        await controller.updateSelectedModelForChat('c', modelIdentifier);
        expect(service.updateSelectedModelForChat).toHaveBeenCalledWith('c', modelIdentifier);

        const personaIdentifier: PersonaIdentifier = {
            selectedPersonaId: '00000000-0000-0000-0000-00000000d099',
        } as PersonaIdentifier;
        await controller.updateSelectedPersonaForChat('c', personaIdentifier);
        expect(service.updateSelectedPersonaForChat).toHaveBeenCalledWith('c', personaIdentifier);

        await controller.updateSelectedChat('c');
        expect(service.updateSelectedChat).toHaveBeenCalledWith('c');
    });

    it('normalizes empty selected persona id to null', async () => {
        const service = {
            updateSelectedPersonaForChat: vi.fn().mockResolvedValue(undefined),
        } as unknown as ChatService;

        const controller = new ChatController(service);
        await controller.updateSelectedPersonaForChat('c', { selectedPersonaId: '' });

        expect(service.updateSelectedPersonaForChat).toHaveBeenCalledWith('c', {
            selectedPersonaId: null,
        });
    });
});
