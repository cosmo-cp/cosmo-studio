import { inject, injectable } from 'inversify';
import { z } from 'zod';
import { CORETYPES } from 'core/types/types';
import { ChatService } from 'core/services/ChatService';
import { IpcController, IpcHandler } from '../ipc/Decorators';
import { Controller } from './Controller';
import type { AgentIdentifier, Chat, ChatWithMessages, ModelIdentifier, NewChat, PersonaIdentifier } from 'core/dto';

const personaIdentifierSchema = z
    .object({
        selectedPersonaId: z.preprocess((value) => {
            if (typeof value !== 'string') {
                return value;
            }
            const trimmedValue = value.trim();
            return trimmedValue === '' ? null : trimmedValue;
        }, z.string().nullable()),
    })
    .strict();
const newChatSchema = z.custom<NewChat>();
const newChatUpdateSchema = z.custom<Partial<NewChat>>();
const modelIdentifierSchema = z.custom<ModelIdentifier>();
const agentIdentifierSchema = z
    .object({
        selectedAgentId: z.string().min(1).nullable().default(null),
        selectedRuntime: z.enum(['model', 'agent']).default('agent'),
    })
    .strict();

@injectable()
@IpcController('chat')
export class ChatController implements Controller {
    constructor(@inject(CORETYPES.ChatService) private chatService: ChatService) {}

    @IpcHandler('getAllChats', z.tuple([z.string().nullable()]))
    public async getAllChats(searchQuery: string | null): Promise<Chat[]> {
        return this.chatService.getAllChats(searchQuery);
    }

    @IpcHandler('getChatById', z.tuple([z.string().min(1)]))
    public async getChatById(id: string): Promise<ChatWithMessages | undefined> {
        return this.chatService.getChatById(id);
    }

    @IpcHandler('createChat', z.tuple([newChatSchema]))
    public async createChat(newChat: NewChat): Promise<void> {
        return this.chatService.createChat(newChat);
    }

    @IpcHandler('updateChat', z.tuple([z.string().min(1), newChatUpdateSchema]))
    public async updateChat(id: string, updates: Partial<NewChat>): Promise<Chat> {
        return this.chatService.updateChat(id, updates);
    }

    @IpcHandler('deleteChat', z.tuple([z.string().min(1)]))
    public async deleteChat(id: string): Promise<void> {
        return this.chatService.deleteChat(id);
    }

    @IpcHandler('updatePinnedStatusForChat', z.tuple([z.string().min(1), z.boolean()]))
    public async updatePinnedStatusForChat(id: string, pinned: boolean): Promise<void> {
        return this.chatService.updatePinnedStatusForChat(id, pinned);
    }

    @IpcHandler('getSelectedModelForChat', z.tuple([z.string().min(1)]))
    public async getSelectedModelForChat(id: string): Promise<string | null> {
        return this.chatService.getSelectedModelForChat(id);
    }

    @IpcHandler('updateSelectedModelForChat', z.tuple([z.string().min(1), modelIdentifierSchema]))
    public async updateSelectedModelForChat(id: string, modelIdentifier: ModelIdentifier): Promise<void> {
        return this.chatService.updateSelectedModelForChat(id, modelIdentifier);
    }

    @IpcHandler('updateSelectedAgentForChat', z.tuple([z.string().min(1), agentIdentifierSchema]))
    public async updateSelectedAgentForChat(id: string, agentIdentifier: AgentIdentifier): Promise<void> {
        const parsedAgentIdentifier = agentIdentifierSchema.parse(agentIdentifier);
        return this.chatService.updateSelectedAgentForChat(id, parsedAgentIdentifier);
    }

    @IpcHandler('updateSelectedPersonaForChat', z.tuple([z.string().min(1), personaIdentifierSchema]))
    public async updateSelectedPersonaForChat(id: string, personaIdentifier: PersonaIdentifier): Promise<void> {
        const parsedPersonaIdentifier: PersonaIdentifier = {
            selectedPersonaId: personaIdentifierSchema.parse(personaIdentifier).selectedPersonaId ?? null,
        };
        return this.chatService.updateSelectedPersonaForChat(id, parsedPersonaIdentifier);
    }

    @IpcHandler('updateSelectedChat', z.tuple([z.string().min(1)]))
    public async updateSelectedChat(id: string): Promise<void> {
        return this.chatService.updateSelectedChat(id);
    }
}
