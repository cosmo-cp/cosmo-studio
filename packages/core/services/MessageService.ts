import { inject, injectable } from 'inversify';
import { CORETYPES } from '../types/types';
import { MessageRepository } from '../repositories/MessageRepository';
import { Message, NewMessage } from '../dto';
import { UIMessage } from 'ai';
import { toUiMessages } from '../uiMessageMapper';

@injectable()
export class MessageService {
    constructor(@inject(CORETYPES.MessageRepository) private messageRepository: MessageRepository) {}

    public async getMessagesByChatId(chatId: string): Promise<UIMessage[]> {
        const messages = await this.messageRepository.getMessagesByChatId(chatId);
        return toUiMessages(messages);
    }

    public async createMessage(newMessage: NewMessage): Promise<Message> {
        return this.messageRepository.create(newMessage);
    }

    public async updateMessage(id: string, updates: Partial<NewMessage>): Promise<Message> {
        return this.messageRepository.update(id, updates);
    }

    public async deleteMessage(id: string): Promise<void> {
        return this.messageRepository.delete(id);
    }
}
