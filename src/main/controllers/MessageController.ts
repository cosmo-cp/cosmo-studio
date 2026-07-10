import { inject, injectable } from 'inversify';
import { CORETYPES } from '../../../packages/core/types/types';
import { MessageService } from '../../../packages/core/services/MessageService';
import { ChatMessageSyncAck, ChatMessageSyncInput, Message, NewMessage } from '../../../packages/core/dto';
import { IpcController, IpcHandler } from '../ipc/Decorators';
import { UIMessage } from 'ai';
import { z } from 'zod';

const uiMessagePartSchema = z
    .object({
        type: z.string().min(1),
    })
    .passthrough();

const uiMessageSchema = z
    .object({
        id: z.string().min(1),
        role: z.enum(['system', 'user', 'assistant']),
        parts: z.array(uiMessagePartSchema),
        metadata: z.unknown().optional(),
    })
    .strict();

const chatMessageSyncSchema = z
    .object({
        chatId: z.uuid(),
        sequence: z.number().int().positive(),
        messages: z.array(uiMessageSchema),
    })
    .strict();

@injectable()
@IpcController('message')
export class MessageController {
    constructor(@inject(CORETYPES.MessageService) private messageService: MessageService) {}

    @IpcHandler('getByChat')
    public async getByChat(chatId: string): Promise<UIMessage[]> {
        return this.messageService.getMessagesByChatId(chatId);
    }

    @IpcHandler('syncForChat')
    public async syncForChat(input: ChatMessageSyncInput): Promise<ChatMessageSyncAck> {
        return this.messageService.syncForChat(chatMessageSyncSchema.parse(input) as ChatMessageSyncInput);
    }

    @IpcHandler('save')
    public async save(newMessage: NewMessage): Promise<Message> {
        return this.messageService.createMessage(newMessage);
    }

    @IpcHandler('update')
    public async update(id: string, updates: Partial<NewMessage>) {
        return this.messageService.updateMessage(id, updates);
    }

    @IpcHandler('delete')
    public async delete(id: string) {
        return this.messageService.deleteMessage(id);
    }
}
