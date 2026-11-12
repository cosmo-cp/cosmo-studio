import { relations } from 'drizzle-orm';
import { boolean, index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { workspace } from './workspaceSchema';

export const chat = pgTable(
    'Chat',
    {
        id: uuid('id').primaryKey().notNull().defaultRandom(),
        createdAt: timestamp('createdAt').notNull().defaultNow(),
        title: text('title').notNull(),
        pinned: boolean('pinned').default(false),
        pinnedAt: timestamp('pinnedAt'),
        selectedProvider: text('selectedProvider'),
        selectedModelId: text('selectedModelId'),
        selectedRuntime: text('selectedRuntime').$type<'model' | 'agent'>().default('model'),
        selectedAgentId: uuid('selectedAgentId'),
        selectedPersonaId: uuid('selectedPersonaId'),
        workspaceId: uuid('workspaceId').references(
            () => {
                return workspace.id;
            },
            { onDelete: 'set null' },
        ),
        selected: boolean().default(false),
        lastMessage: text('lastMessage'),
        lastMessageAt: timestamp('lastMessageAt'),
    },
    (table) => {
        return {
            workspaceIdIdx: index('chat_workspace_id_idx').on(table.workspaceId),
        };
    },
);

export const chatRelations = relations(chat, ({ one, many }) => {
    return {
        workspace: one(workspace, {
            fields: [chat.workspaceId],
            references: [workspace.id],
        }),
        messages: many(message),
    };
});

export const messageRole = pgEnum('message_role', ['user', 'assistant', 'system']);

export const message = pgTable('Message', {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    chatId: uuid('chatId')
        .notNull()
        .references(
            () => {
                return chat.id;
            },
            { onDelete: 'cascade' },
        ),
    role: messageRole('role'),
    text: text('text'),
    reasoning: text('reasoning'),
    modelIdentifier: text('modelIdentifier'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
});

export const messageRelations = relations(message, ({ one }) => {
    return {
        chat: one(chat, {
            fields: [message.chatId],
            references: [chat.id],
        }),
    };
});
