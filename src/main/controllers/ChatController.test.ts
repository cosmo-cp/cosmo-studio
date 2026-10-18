import type { AgentIdentifier, Chat, ChatWithMessages, ModelIdentifier, NewChat, PersonaIdentifier } from 'core/dto';
import type { ChatService } from 'core/services/ChatService';
import { describe, expect, it, vi } from 'vitest';
import type { z } from 'zod';
import { IPC_ARGS_SCHEMA_METADATA_KEY } from '../ipc/Decorators';
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

    it.each([
        ['', null],
        [' \t\n ', null],
        [null, null],
        [undefined, null],
        ['agent-id', 'agent-id'],
        [' agent-id ', 'agent-id'],
    ])('normalizes selected agent id %j before persistence', async (selectedAgentId, expectedId) => {
        const service = {
            updateSelectedAgentForChat: vi.fn().mockResolvedValue(undefined),
        } as unknown as ChatService;
        const controller = new ChatController(service);
        const schemas = Reflect.getMetadata(IPC_ARGS_SCHEMA_METADATA_KEY, ChatController) as Record<string, z.ZodTuple>;

        for (const selectedRuntime of ['model', 'agent'] as const) {
            const args = schemas.updateSelectedAgentForChat.parse([
                'c',
                { selectedAgentId: selectedAgentId, selectedRuntime: selectedRuntime },
            ]);
            await controller.updateSelectedAgentForChat(args[0], args[1]);
            expect(service.updateSelectedAgentForChat).toHaveBeenLastCalledWith('c', {
                selectedAgentId: expectedId,
                selectedRuntime: selectedRuntime,
            });
        }

        await controller.updateSelectedAgentForChat('c', {
            selectedAgentId: selectedAgentId,
            selectedRuntime: 'agent',
        } as AgentIdentifier);
        expect(service.updateSelectedAgentForChat).toHaveBeenLastCalledWith('c', {
            selectedAgentId: expectedId,
            selectedRuntime: 'agent',
        });
    });

    it('retains agent selection defaults', async () => {
        const service = {
            updateSelectedAgentForChat: vi.fn().mockResolvedValue(undefined),
        } as unknown as ChatService;
        const controller = new ChatController(service);
        await controller.updateSelectedAgentForChat('c', {} as AgentIdentifier);

        expect(service.updateSelectedAgentForChat).toHaveBeenCalledWith('c', {
            selectedAgentId: null,
            selectedRuntime: 'agent',
        });
    });

    it.each([
        { selectedAgentId: 123, selectedRuntime: 'agent' },
        { selectedAgentId: {}, selectedRuntime: 'agent' },
        { selectedAgentId: [], selectedRuntime: 'agent' },
        { selectedAgentId: 'agent-id', selectedRuntime: 'invalid' },
        { selectedAgentId: 'agent-id', selectedRuntime: 'agent', extra: true },
    ])('rejects malformed agent selections %j', async (input) => {
        const service = {
            updateSelectedAgentForChat: vi.fn(),
        } as unknown as ChatService;
        const controller = new ChatController(service);
        const schemas = Reflect.getMetadata(IPC_ARGS_SCHEMA_METADATA_KEY, ChatController) as Record<string, z.ZodTuple>;

        expect(() => {
            return schemas.updateSelectedAgentForChat.parse(['c', input]);
        }).toThrow();
        await expect(controller.updateSelectedAgentForChat('c', input as unknown as AgentIdentifier)).rejects.toThrow();
        expect(service.updateSelectedAgentForChat).not.toHaveBeenCalled();
    });
});
