import { inject, injectable } from 'inversify';
import { AgentIdentifier, Chat, ChatWithMessages, ModelIdentifier, NewChat, PersonaIdentifier } from '../dto';
import { ChatRepository } from '../repositories/ChatRepository';
import { CORETYPES } from '../types/types';

@injectable()
export class ChatService {
    constructor(@inject(CORETYPES.ChatRepository) private chatRepository: ChatRepository) {}

    public async getAllChats(searchQuery: string | null): Promise<Chat[]> {
        return this.chatRepository.getAll(searchQuery);
    }

    public async getChatById(id: string): Promise<ChatWithMessages | undefined> {
        return this.chatRepository.getById(id);
    }

    public async createChat(newChat: NewChat): Promise<void> {
        return this.chatRepository.create(newChat);
    }

    public async updateChat(id: string, updates: Partial<NewChat>): Promise<Chat> {
        return this.chatRepository.update(id, updates);
    }

    public async deleteChat(id: string): Promise<void> {
        return this.chatRepository.delete(id);
    }

    public async updatePinnedStatusForChat(id: string, pinned: boolean): Promise<void> {
        return this.chatRepository.updatePinnedStatus(id, pinned);
    }

    public async getSelectedModelForChat(id: string): Promise<string | null> {
        return this.chatRepository.getSelectedModelForChatId(id);
    }

    public async updateSelectedModelForChat(id: string, modelIdentifier: ModelIdentifier): Promise<void> {
        return this.chatRepository.updateSelectedModelForChatId(id, modelIdentifier);
    }

    public async updateSelectedAgentForChat(id: string, agentIdentifier: AgentIdentifier): Promise<void> {
        return this.chatRepository.updateSelectedAgentForChatId(id, agentIdentifier);
    }

    public async updateSelectedPersonaForChat(id: string, personaIdentifier: PersonaIdentifier): Promise<void> {
        return this.chatRepository.updateSelectedPersonaForChatId(id, personaIdentifier);
    }

    public async updateSelectedChat(id: string): Promise<void> {
        return this.chatRepository.updateSelectedChat(id);
    }
}
