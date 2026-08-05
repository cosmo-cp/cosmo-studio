import type { UIMessage } from 'ai';
import type { Message, NewMessage } from 'core/dto';
import type { MessageService } from 'core/services/MessageService';
import { describe, expect, it, vi } from 'vitest';
import { MessageController } from './MessageController';

describe('MessageController', () => {
    it('delegates message operations to the service', async () => {
        const uiMessages: UIMessage[] = [{ id: 'm', role: 'user', parts: [] } as UIMessage];
        const created = { id: 'm' } as Message;
        const updated = { id: 'm' } as Message;

        const service = {
            getMessagesByChatId: vi.fn().mockResolvedValue(uiMessages),
            createMessage: vi.fn().mockResolvedValue(created),
            updateMessage: vi.fn().mockResolvedValue(updated),
            deleteMessage: vi.fn().mockResolvedValue(undefined),
        } as unknown as MessageService;

        const controller = new MessageController(service);

        await expect(controller.getByChat('c')).resolves.toEqual(uiMessages);
        expect(service.getMessagesByChatId).toHaveBeenCalledWith('c');

        const newMessage: NewMessage = {
            chatId: 'c',
            role: 'user',
            text: 'hi',
            reasoning: null,
        } as unknown as NewMessage;
        await expect(controller.save(newMessage)).resolves.toEqual(created);
        expect(service.createMessage).toHaveBeenCalledWith(newMessage);

        await expect(controller.update('m', { text: 'updated' } as Partial<NewMessage>)).resolves.toEqual(updated);
        expect(service.updateMessage).toHaveBeenCalledWith('m', { text: 'updated' });

        await controller.delete('m');
        expect(service.deleteMessage).toHaveBeenCalledWith('m');
    });
});
