import { index, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

export const command = pgTable(
    'Command',
    {
        id: uuid('id').primaryKey().notNull().defaultRandom(),
        organizationId: uuid('organizationId'),
        userId: uuid('userId'),
        name: text('name').notNull(),
        description: text('description').notNull(),
        template: text('template').notNull(),
        argumentLabel: text('argumentLabel'),
        createdAt: timestamp('createdAt').notNull().defaultNow(),
        updatedAt: timestamp('updatedAt').notNull().defaultNow(),
    },
    (table) => {
        return {
            organizationIdIdx: index('command_organization_id_idx').on(table.organizationId),
            orgNameUnique: unique('command_org_name_unique').on(table.organizationId, table.name).nullsNotDistinct(),
        };
    },
);
