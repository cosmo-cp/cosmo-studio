import { ipcRenderer } from 'electron';
import type { UIMessage } from 'ai';
import type { Message, NewMessage } from '../../../packages/core/dto';

export interface MessageApi {
  getByChat(chatId: string): Promise<UIMessage[]>;
  save(newMessage: NewMessage): Promise<Message>;
  update(id: string, updates: Partial<NewMessage>): Promise<void>;
  delete(id: string): Promise<void>;
}

export const messageApi: MessageApi = {
  getByChat: (chatId: string) => ipcRenderer.invoke('message:getByChat', chatId),
  save: (newMessage: NewMessage) => ipcRenderer.invoke('message:save', newMessage),
  update: (id: string, updates: Partial<NewMessage>) => ipcRenderer.invoke('message:update', id, updates),
  delete: (id: string) => ipcRenderer.invoke('message:delete', id),
};
