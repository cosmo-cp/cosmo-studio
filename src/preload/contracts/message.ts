import type { UIMessage } from 'ai';
import type { Message, NewMessage } from '../../../packages/core/dto';

export interface MessageApi {
    getByChat(chatId: string): Promise<UIMessage[]>;
    save(newMessage: NewMessage): Promise<Message>;
    update(id: string, updates: Partial<NewMessage>): Promise<void>;
    delete(id: string): Promise<void>;
}
