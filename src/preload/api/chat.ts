import { ipcRenderer } from 'electron';
import type { AgentIdentifier, ModelIdentifier, NewChat, PersonaIdentifier } from '../../../packages/core/dto';
import type { ChatApi } from '../contracts/chat';

export const chatApi: ChatApi = {
    getAllChats: (searchQuery: string | null) => {
        return ipcRenderer.invoke('chat:getAllChats', searchQuery);
    },
    getChatById: (id: string) => {
        return ipcRenderer.invoke('chat:getChatById', id);
    },
    createChat: (newChat: NewChat) => {
        return ipcRenderer.invoke('chat:createChat', newChat);
    },
    updateChat: (id: string, updates: Partial<NewChat>) => {
        return ipcRenderer.invoke('chat:updateChat', id, updates);
    },
    deleteChat: (id: string) => {
        return ipcRenderer.invoke('chat:deleteChat', id);
    },
    updatePinnedStatusForChat: (id: string, pinned: boolean) => {
        return ipcRenderer.invoke('chat:updatePinnedStatusForChat', id, pinned);
    },
    getSelectedModelForChat: (id: string) => {
        return ipcRenderer.invoke('chat:getSelectedModelForChat', id);
    },
    updateSelectedModelForChat: (id: string, modelIdentifier: ModelIdentifier) => {
        return ipcRenderer.invoke('chat:updateSelectedModelForChat', id, modelIdentifier);
    },
    updateSelectedAgentForChat: (id: string, agentIdentifier: AgentIdentifier) => {
        return ipcRenderer.invoke('chat:updateSelectedAgentForChat', id, agentIdentifier);
    },
    updateSelectedPersonaForChat: (id: string, personaIdentifier: PersonaIdentifier) => {
        return ipcRenderer.invoke('chat:updateSelectedPersonaForChat', id, personaIdentifier);
    },
    updateSelectedChat: (id: string) => {
        return ipcRenderer.invoke('chat:updateSelectedChat', id);
    },
};
