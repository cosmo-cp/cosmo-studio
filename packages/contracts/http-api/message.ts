import type { UIMessage } from 'ai';
import type { Message, NewMessage } from 'core/dto';
import type { MessageApi } from '../contracts/message';
import { callRpc } from './common';

export const messageHttpApi: MessageApi = {
    getByChat: (chatId: string) => {
        return callRpc<UIMessage[]>('message', 'getByChat', [chatId]);
    },
    save: (newMessage: NewMessage) => {
        return callRpc<Message>('message', 'save', [newMessage]);
    },
    update: (id: string, updates: Partial<NewMessage>) => {
        return callRpc<void>('message', 'update', [id, updates]);
    },
    delete: (id: string) => {
        return callRpc<void>('message', 'delete', [id]);
    },
};
