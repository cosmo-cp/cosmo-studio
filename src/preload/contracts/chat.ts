import type {
    AgentIdentifier,
    Chat,
    ChatWithMessages,
    ModelIdentifier,
    NewChat,
    PersonaIdentifier,
} from '../../../packages/core/dto';

export interface ChatApi {
    getAllChats(searchQuery: string | null): Promise<Chat[]>;
    getChatById(id: string): Promise<ChatWithMessages | undefined>;
    createChat(newChat: NewChat): Promise<void>;
    updateChat(id: string, updates: Partial<NewChat>): Promise<Chat>;
    deleteChat(id: string): Promise<void>;
    updatePinnedStatusForChat(id: string, pinned: boolean): Promise<void>;
    getSelectedModelForChat(id: string): Promise<string | null>;
    updateSelectedModelForChat(id: string, modelIdentifier: ModelIdentifier): Promise<void>;
    updateSelectedAgentForChat(id: string, agentIdentifier: AgentIdentifier): Promise<void>;
    updateSelectedPersonaForChat(id: string, personaIdentifier: PersonaIdentifier): Promise<void>;
    updateSelectedChat(id: string): Promise<void>;
}
