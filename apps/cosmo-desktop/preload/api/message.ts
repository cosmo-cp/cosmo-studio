import type { MessageApi } from 'contracts/contracts/message';
import type { NewMessage } from 'core/dto';
import { ipcRenderer } from 'electron';

export const messageApi: MessageApi = {
    getByChat: (chatId: string) => {
        return ipcRenderer.invoke('message:getByChat', chatId);
    },
    save: (newMessage: NewMessage) => {
        return ipcRenderer.invoke('message:save', newMessage);
    },
    update: (id: string, updates: Partial<NewMessage>) => {
        return ipcRenderer.invoke('message:update', id, updates);
    },
    delete: (id: string) => {
        return ipcRenderer.invoke('message:delete', id);
    },
};
