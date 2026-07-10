import { inject, injectable } from 'inversify';
import { asc, eq } from 'drizzle-orm';
import { CORETYPES } from '../types/types';
import { DatabaseManager } from '../database/DatabaseManager';
import { ChatMessageSyncAck, ChatMessageSyncInput, Message, NewMessage } from '../dto';
import { chat, message } from '../database/schema/chatSchema';
import type { UIMessage } from 'ai';

type MessageMetadata = { modelId?: string };

const getPartText = (uiMessage: UIMessage, partType: string): string | null => {
    const textParts: string[] = [];
    for (const part of uiMessage.parts) {
        if (part.type === partType && 'text' in part && typeof part.text === 'string') {
            textParts.push(part.text);
        }
    }
    const text = textParts.join('\n');
    return text.length > 0 ? text : null;
};

const getModelIdentifier = (uiMessage: UIMessage): string | null => {
    const metadata = uiMessage.metadata as MessageMetadata | undefined;
    return metadata?.modelId ?? null;
};

@injectable()
export class MessageRepository {
    private db;

    constructor(@inject(CORETYPES.DatabaseManager) databaseManager: DatabaseManager) {
        this.db = databaseManager.getInstance();
    }

    public async getMessagesByChatId(chatId: string): Promise<Message[]> {
        return this.db.select().from(message).where(eq(message.chatId, chatId)).orderBy(asc(message.createdAt));
    }

    public async syncForChat(input: ChatMessageSyncInput): Promise<ChatMessageSyncAck> {
        return this.db.transaction(async (tx) => {
            const [currentChat] = await tx.select().from(chat).where(eq(chat.id, input.chatId)).limit(1);
            if (!currentChat) {
                throw new Error(`Chat ${input.chatId} not found`);
            }

            if ((currentChat.syncVersion ?? 0) >= input.sequence) {
                return {
                    chatId: input.chatId,
                    sequence: input.sequence,
                    accepted: false,
                };
            }

            const now = new Date();
            await tx.delete(message).where(eq(message.chatId, input.chatId));

            if (input.messages.length > 0) {
                await tx.insert(message).values(
                    input.messages.map((uiMessage, index) => ({
                        chatId: input.chatId,
                        role: uiMessage.role,
                        text: getPartText(uiMessage, 'text'),
                        reasoning: getPartText(uiMessage, 'reasoning'),
                        modelIdentifier: getModelIdentifier(uiMessage),
                        uiMessageId: uiMessage.id,
                        uiMessage,
                        createdAt: new Date(now.getTime() + index),
                    })),
                );
            }

            const firstUserMessage = input.messages.find((uiMessage) => uiMessage.role === 'user');
            const firstUserText = firstUserMessage ? getPartText(firstUserMessage, 'text') : null;
            const lastMessage = input.messages[input.messages.length - 1];
            const lastText = lastMessage ? getPartText(lastMessage, 'text') : null;
            const chatUpdate: Partial<typeof chat.$inferInsert> = {
                syncVersion: input.sequence,
                lastMessageAt: now,
            };

            if (lastText) {
                chatUpdate.lastMessage = lastText.slice(0, 200);
            }

            if (input.messages.length > 0 && firstUserText && currentChat.title === 'New Chat') {
                chatUpdate.title = firstUserText.slice(0, 50);
            }

            await tx.update(chat).set(chatUpdate).where(eq(chat.id, input.chatId));

            return {
                chatId: input.chatId,
                sequence: input.sequence,
                accepted: true,
            };
        });
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
