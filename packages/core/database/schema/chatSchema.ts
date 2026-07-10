import { relations } from 'drizzle-orm';
import { boolean, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import type { UIMessage } from 'ai';

export const chat = pgTable('Chat', {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    title: text('title').notNull(),
    pinned: boolean('pinned').default(false),
    pinnedAt: timestamp('pinnedAt'),
    selectedProvider: text('selectedProvider'),
    selectedModelId: text('selectedModelId'),
    selectedPersonaId: uuid('selectedPersonaId'),
    selected: boolean().default(false),
    syncVersion: integer('syncVersion').notNull().default(0),
    lastMessage: text('lastMessage'),
    lastMessageAt: timestamp('lastMessageAt'),
});

export const chatRelations = relations(chat, ({ many }) => ({
    messages: many(message),
}));

export const messageRole = pgEnum('message_role', ['user', 'assistant', 'system']);

export const message = pgTable('Message', {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    chatId: uuid('chatId')
        .notNull()
        .references(() => chat.id, { onDelete: 'cascade' }),
    role: messageRole('role'),
    text: text('text'),
    reasoning: text('reasoning'),
    modelIdentifier: text('modelIdentifier'),
    uiMessageId: text('uiMessageId'),
    uiMessage: jsonb('uiMessage').$type<UIMessage>(),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
});

export const messageRelations = relations(message, ({ one }) => ({
    chat: one(chat, {
        fields: [message.chatId],
        references: [chat.id],
    }),
}));
