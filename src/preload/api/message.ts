import { ipcRenderer } from 'electron';
import type {NewMessage, Message} from '../../../packages/core/dto';
import type {UIMessage} from 'ai';
import { callRpc } from './common';

export interface MessageApi {
    getByChat(chatId: string): Promise<UIMessage[]>;
    save(newMessage: NewMessage): Promise<Message>;
    update(id: string, updates: Partial<NewMessage>): Promise<void>;
    delete(id: string): Promise<void>;
}

export const messageRpcApi: MessageApi = {
    getByChat: (chatId: string) => ipcRenderer.invoke('message:getByChat', chatId),
    save: (newMessage: NewMessage) => ipcRenderer.invoke('message:save', newMessage),
    update: (id: string, updates: Partial<NewMessage>) => ipcRenderer.invoke('message:update', id, updates),
    delete: (id: string) => ipcRenderer.invoke('message:delete', id)
};

export const messageHttpApi: MessageApi = {
    getByChat: (chatId: string) => callRpc<UIMessage[]>('message', 'getByChat', [chatId]),
    save: (newMessage: NewMessage) => callRpc<Message>('message', 'save', [newMessage]),
    update: (id: string, updates: Partial<NewMessage>) => callRpc<void>('message', 'update', [id, updates]),
    delete: (id: string) => callRpc<void>('message', 'delete', [id]),
}
