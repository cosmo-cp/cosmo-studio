import { relations } from 'drizzle-orm';
import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { acpAgent } from './acpAgentSchema';
import { chat } from './chatSchema';
import { task } from './taskSchema';

export const workspace = pgTable(
    'Workspace',
    {
        id: uuid('id').primaryKey().notNull().defaultRandom(),
        name: text('name').notNull(),
        canonicalPath: text('canonicalPath').notNull().unique(),
        rawPath: text('rawPath').notNull(),
        createdAt: timestamp('createdAt').notNull().defaultNow(),
        updatedAt: timestamp('updatedAt').notNull().defaultNow(),
    },
    (table) => {
        return {
            canonicalPathIdx: index('workspace_canonical_path_idx').on(table.canonicalPath),
            createdAtIdx: index('workspace_created_at_idx').on(table.createdAt),
        };
    },
);

export const workspaceRelations = relations(workspace, ({ many }) => {
    return {
        tasks: many(task),
        chats: many(chat),
        agents: many(acpAgent),
    };
});
