import type { UIMessage } from 'ai';
import { inject, injectable } from 'inversify';
import { z } from 'zod';
import type { Message, NewMessage } from 'core/dto';
import { MessageService } from 'core/services/MessageService';
import { CORETYPES } from 'core/types/types';
import { IpcController, IpcHandler } from '../ipc/Decorators';

const newMessageSchema = z.custom<NewMessage>();
const messageUpdateSchema = z.custom<Partial<NewMessage>>();

@injectable()
@IpcController('message')
export class MessageController {
    constructor(@inject(CORETYPES.MessageService) private messageService: MessageService) {}

    @IpcHandler('getByChat', z.tuple([z.string().min(1)]))
    public async getByChat(chatId: string): Promise<UIMessage[]> {
        return this.messageService.getMessagesByChatId(chatId);
    }

    @IpcHandler('save', z.tuple([newMessageSchema]))
    public async save(newMessage: NewMessage): Promise<Message> {
        return this.messageService.createMessage(newMessage);
    }

    @IpcHandler('update', z.tuple([z.string().min(1), messageUpdateSchema]))
    public async update(id: string, updates: Partial<NewMessage>) {
        return this.messageService.updateMessage(id, updates);
    }

    @IpcHandler('delete', z.tuple([z.string().min(1)]))
    public async delete(id: string) {
        return this.messageService.deleteMessage(id);
    }
}
