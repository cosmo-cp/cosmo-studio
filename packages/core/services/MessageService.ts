import { inject, injectable } from 'inversify';
import { CORETYPES } from '../types/types';
import { MessageRepository } from '../repositories/MessageRepository';
import { Message, NewMessage } from '../dto';
import { UIMessage } from 'ai';

@injectable()
export class MessageService {
    constructor(@inject(CORETYPES.MessageRepository) private messageRepository: MessageRepository) {}

    public async getMessagesByChatId(chatId: string): Promise<UIMessage[]> {
        const messages = await this.messageRepository.getMessagesByChatId(chatId);
        return this.convertToUiMessage(messages);
    }

    private convertToUiMessage(messages: Message[]) {
        return messages.map((message) => {
            const parts: { type: 'text' | 'reasoning'; text: string }[] = [];

            if (message.text) {
                parts.push({ type: 'text', text: message.text });
            }
            if (message.reasoning) {
                parts.push({ type: 'reasoning', text: message.reasoning });
            }

            const metadata = message.modelIdentifier ? { modelId: message.modelIdentifier } : undefined;

            const base = {
                id: message.id,
                role: message.role,
                parts: parts,
            };

            return metadata ? { ...base, metadata } : base;
        });
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
