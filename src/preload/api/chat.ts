import { ipcRenderer } from 'electron';
import type {NewChat, Chat, ChatWithMessages, ModelIdentifier, AgentIdentifier, PersonaIdentifier} from '../../../packages/core/dto';
import { callRpc } from './common';

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

export const chatRpcApi: ChatApi = {
    getAllChats: (searchQuery: string | null) => ipcRenderer.invoke('chat:getAllChats', searchQuery),
    getChatById: (id: string) => ipcRenderer.invoke('chat:getChatById', id),
    createChat: (newChat: NewChat) => ipcRenderer.invoke('chat:createChat', newChat),
    updateChat: (id: string, updates: Partial<NewChat>) => ipcRenderer.invoke('chat:updateChat', id, updates),
    deleteChat: (id: string) => ipcRenderer.invoke('chat:deleteChat', id),
    updatePinnedStatusForChat: (id: string, pinned: boolean) => ipcRenderer.invoke('chat:updatePinnedStatusForChat', id, pinned),
    getSelectedModelForChat: (id: string) => ipcRenderer.invoke('chat:getSelectedModelForChat', id),
    updateSelectedModelForChat: (id: string, modelIdentifier: ModelIdentifier) => ipcRenderer.invoke('chat:updateSelectedModelForChat', id, modelIdentifier),
    updateSelectedAgentForChat: (id: string, agentIdentifier: AgentIdentifier) => ipcRenderer.invoke('chat:updateSelectedAgentForChat', id, agentIdentifier),
    updateSelectedPersonaForChat: (id: string, personaIdentifier: PersonaIdentifier) => ipcRenderer.invoke('chat:updateSelectedPersonaForChat', id, personaIdentifier),
    updateSelectedChat: (id: string) => ipcRenderer.invoke('chat:updateSelectedChat', id)
};

export const chatHttpApi: ChatApi = {
    getAllChats: (searchQuery: string | null) => callRpc<Chat[]>('chat', 'getAllChats', [searchQuery]),
    getChatById: (id: string) => callRpc<ChatWithMessages | undefined>('chat', 'getChatById', [id]),
    createChat: (newChat: NewChat) => callRpc<void>('chat', 'createChat', [newChat]),
    updateChat: (id: string, updates: Partial<NewChat>) => callRpc<Chat>('chat', 'updateChat', [id, updates]),
    deleteChat: (id: string) => callRpc<void>('chat', 'deleteChat', [id]),
    updatePinnedStatusForChat: (id: string, pinned: boolean) => callRpc<void>('chat', 'updatePinnedStatusForChat', [id, pinned]),
    getSelectedModelForChat: (id: string) => callRpc<string | null>('chat', 'getSelectedModelForChat', [id]),
    updateSelectedModelForChat: (id: string, modelIdentifier: ModelIdentifier) => callRpc<void>('chat', 'updateSelectedModelForChat', [id, modelIdentifier]),
    updateSelectedAgentForChat: (id: string, agentIdentifier: AgentIdentifier) => callRpc<void>('chat', 'updateSelectedAgentForChat', [id, agentIdentifier]),
    updateSelectedPersonaForChat: (id: string, personaIdentifier: PersonaIdentifier) => callRpc<void>('chat', 'updateSelectedPersonaForChat', [id, personaIdentifier]),
    updateSelectedChat: (id: string) => callRpc<void>('chat', 'updateSelectedChat', [id]),
}
