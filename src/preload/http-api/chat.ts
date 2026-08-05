import type {
    AgentIdentifier,
    Chat,
    ChatWithMessages,
    ModelIdentifier,
    NewChat,
    PersonaIdentifier,
} from '../../../packages/core/dto';
import { callRpc } from '../api/common';
import type { ChatApi } from '../contracts/chat';

export const chatHttpApi: ChatApi = {
    getAllChats: (searchQuery: string | null) => {
        return callRpc<Chat[]>('chat', 'getAllChats', [searchQuery]);
    },
    getChatById: (id: string) => {
        return callRpc<ChatWithMessages | undefined>('chat', 'getChatById', [id]);
    },
    createChat: (newChat: NewChat) => {
        return callRpc<void>('chat', 'createChat', [newChat]);
    },
    updateChat: (id: string, updates: Partial<NewChat>) => {
        return callRpc<Chat>('chat', 'updateChat', [id, updates]);
    },
    deleteChat: (id: string) => {
        return callRpc<void>('chat', 'deleteChat', [id]);
    },
    updatePinnedStatusForChat: (id: string, pinned: boolean) => {
        return callRpc<void>('chat', 'updatePinnedStatusForChat', [id, pinned]);
    },
    getSelectedModelForChat: (id: string) => {
        return callRpc<string | null>('chat', 'getSelectedModelForChat', [id]);
    },
    updateSelectedModelForChat: (id: string, modelIdentifier: ModelIdentifier) => {
        return callRpc<void>('chat', 'updateSelectedModelForChat', [id, modelIdentifier]);
    },
    updateSelectedAgentForChat: (id: string, agentIdentifier: AgentIdentifier) => {
        return callRpc<void>('chat', 'updateSelectedAgentForChat', [id, agentIdentifier]);
    },
    updateSelectedPersonaForChat: (id: string, personaIdentifier: PersonaIdentifier) => {
        return callRpc<void>('chat', 'updateSelectedPersonaForChat', [id, personaIdentifier]);
    },
    updateSelectedChat: (id: string) => {
        return callRpc<void>('chat', 'updateSelectedChat', [id]);
    },
};
