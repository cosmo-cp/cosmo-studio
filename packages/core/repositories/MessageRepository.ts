import { asc, eq } from 'drizzle-orm';
import { inject, injectable } from 'inversify';
import { DatabaseManager } from '../database/DatabaseManager';
import { chat, message } from '../database/schema/chatSchema';
import { Message, NewMessage } from '../dto';
import { CORETYPES } from '../types/types';

@injectable()
export class MessageRepository {
    private db;

    constructor(@inject(CORETYPES.DatabaseManager) databaseManager: DatabaseManager) {
        this.db = databaseManager.getInstance();
    }

    public async getMessagesByChatId(chatId: string): Promise<Message[]> {
        return this.db.select().from(message).where(eq(message.chatId, chatId)).orderBy(asc(message.createdAt));
    }

    public async create(newMessage: NewMessage): Promise<Message> {
        return this.db.transaction(async (tx) => {
            const existingMessages = await tx
                .select()
                .from(message)
                .where(eq(message.chatId, newMessage.chatId))
                .limit(1);

            const now = new Date();
            const [createdMessage] = await tx
                .insert(message)
                .values({
                    chatId: newMessage.chatId,
                    role: newMessage.role,
                    text: newMessage.text,
                    reasoning: newMessage.reasoning,
                    modelIdentifier: newMessage.modelIdentifier,
                    createdAt: now,
                })
                .returning();

            const chatUpdate: Partial<typeof chat.$inferInsert> = {
                lastMessageAt: now,
            };

            if (newMessage.text) {
                chatUpdate.lastMessage = newMessage.text.slice(0, 200);
            }

            if (existingMessages.length === 0 && newMessage.text) {
                chatUpdate.title = newMessage.text.slice(0, 50);
            }

            await tx.update(chat).set(chatUpdate).where(eq(chat.id, newMessage.chatId));

            return createdMessage;
        });
    }

    public async update(id: string, updates: Partial<NewMessage>): Promise<Message> {
        const result = await this.db.update(message).set(updates).where(eq(message.id, id)).returning();
        return result[0];
    }

    public async delete(id: string): Promise<void> {
        await this.db.delete(message).where(eq(message.id, id));
    }
}
