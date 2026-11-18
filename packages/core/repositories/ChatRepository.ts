import { UIMessage } from 'ai';
import { and, asc, desc, eq, ilike, SQL } from 'drizzle-orm';
import { inject, injectable } from 'inversify';
import { DatabaseManager } from '../database/DatabaseManager';
import { chat, message } from '../database/schema/schema';
import { AgentIdentifier, Chat, ChatWithMessages, Message, ModelIdentifier, NewChat, PersonaIdentifier } from '../dto';
import { CORETYPES } from '../types/types';
import { toUiMessages } from '../uiMessageMapper';

@injectable()
export class ChatRepository {
    private db;

    constructor(@inject(CORETYPES.DatabaseManager) databaseManager: DatabaseManager) {
        this.db = databaseManager.getInstance();
    }

    public async getAll(searchQuery: string | null): Promise<Chat[]> {
        const conditions: SQL[] = [];
        if (searchQuery) {
            conditions.push(ilike(chat.title, `%${searchQuery.trim()}%`));
        }
        return this.db
            .select()
            .from(chat)
            .where(and(...conditions))
            .orderBy(desc(chat.pinned), desc(chat.pinnedAt), desc(chat.lastMessageAt), desc(chat.createdAt));
    }

    public async getById(id: string): Promise<ChatWithMessages | undefined> {
        const result = await this.db.query.chat.findFirst({
            where: eq(chat.id, id),
            with: { messages: { orderBy: asc(message.createdAt) } },
        });

        return result
            ? {
                  ...result,
                  messages: this.convertToUiMessage(result.messages),
              }
            : undefined;
    }

    private convertToUiMessage(messages: Message[]): UIMessage[] {
        return toUiMessages(messages);
    }

    public async create(newChat: NewChat): Promise<Chat> {
        return await this.db.transaction(async (tx) => {
            // 1. Set all rows to unselected
            await tx.update(chat).set({ selected: false });

            const [createdChat] = await tx
                .insert(chat)
                .values({
                    ...newChat,
                    createdAt: new Date(),
                    title: newChat.title,
                    selected: true,
                })
                .returning();
            return createdChat;
        });
    }

    public async update(id: string, updates: Partial<NewChat>): Promise<Chat> {
        const result = await this.db.update(chat).set(updates).where(eq(chat.id, id)).returning();
        return result[0];
    }

    public async delete(id: string): Promise<void> {
        await this.db.transaction(async (tx) => {
            const [chatToDelete] = await tx
                .select({ selected: chat.selected })
                .from(chat)
                .where(eq(chat.id, id))
                .limit(1);
            await tx.delete(chat).where(eq(chat.id, id));
            if (chatToDelete?.selected) {
                const remaining = await tx
                    .select({ id: chat.id })
                    .from(chat)
                    .orderBy(desc(chat.pinned), desc(chat.pinnedAt), desc(chat.lastMessageAt), desc(chat.createdAt))
                    .limit(1);
                if (remaining.length > 0) {
                    await tx.update(chat).set({ selected: true }).where(eq(chat.id, remaining[0].id));
                }
            }
        });
    }

    public async updatePinnedStatus(id: string, pinned: boolean): Promise<void> {
        const pinnedAt = pinned ? new Date() : null;
        await this.db
            .update(chat)
            .set({
                pinned: pinned,
                pinnedAt: pinnedAt,
            })
            .where(eq(chat.id, id))
            .execute();
    }

    public async getSelectedModelForChatId(chatId: string): Promise<string | null> {
        const chatRecord = await this.db
            .select({ selectedModelId: chat.selectedModelId })
            .from(chat)
            .where(eq(chat.id, chatId))
            .limit(1);
        return chatRecord[0]?.selectedModelId ?? null;
    }

    public async updateSelectedModelForChatId(chatId: string, modelIdentifier: ModelIdentifier): Promise<void> {
        await this.db
            .update(chat)
            .set({
                selectedProvider: modelIdentifier.selectedProvider,
                selectedModelId: modelIdentifier.selectedModelId,
                selectedRuntime: 'model',
            })
            .where(eq(chat.id, chatId));
    }

    public async updateSelectedAgentForChatId(chatId: string, agentIdentifier: AgentIdentifier): Promise<void> {
        await this.db
            .update(chat)
            .set({
                selectedAgentId: agentIdentifier.selectedAgentId,
                selectedRuntime: agentIdentifier.selectedRuntime ?? 'agent',
            })
            .where(eq(chat.id, chatId));
    }

    public async updateSelectedPersonaForChatId(chatId: string, personaIdentifier: PersonaIdentifier): Promise<void> {
        await this.db
            .update(chat)
            .set({
                selectedPersonaId: personaIdentifier.selectedPersonaId,
            })
            .where(eq(chat.id, chatId));
    }

    public async updateSelectedWorkspaceForChatId(chatId: string, workspaceId: string | null): Promise<void> {
        await this.db
            .update(chat)
            .set({
                workspaceId: workspaceId,
            })
            .where(eq(chat.id, chatId));
    }

    public async updateSelectedChat(chatId: string): Promise<void> {
        await this.db.transaction(async (tx) => {
            // 1. Set all rows to false
            await tx.update(chat).set({ selected: false });

            // 2. Set the chosen row to true
            await tx.update(chat).set({ selected: true }).where(eq(chat.id, chatId));
        });
    }
}
