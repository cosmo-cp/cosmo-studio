import { relations } from 'drizzle-orm';
import { index, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { acpAgent } from './acpAgentSchema';
import { chat } from './chatSchema';
import { task } from './taskSchema';

export const workspace = pgTable(
    'Workspace',
    {
        id: uuid('id').primaryKey().notNull().defaultRandom(),
        organizationId: uuid('organizationId'),
        userId: uuid('userId'),
        name: text('name').notNull(),
        canonicalPath: text('canonicalPath').notNull(),
        rawPath: text('rawPath').notNull(),
        createdAt: timestamp('createdAt').notNull().defaultNow(),
        updatedAt: timestamp('updatedAt').notNull().defaultNow(),
    },
    (table) => {
        return {
            canonicalPathIdx: index('workspace_canonical_path_idx').on(table.canonicalPath),
            createdAtIdx: index('workspace_created_at_idx').on(table.createdAt),
            organizationIdIdx: index('workspace_organization_id_idx').on(table.organizationId),
            orgCanonicalPathUnique: unique('workspace_org_canonical_path_unique')
                .on(table.organizationId, table.canonicalPath)
                .nullsNotDistinct(),
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
