import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const userProfile = pgTable(
    'UserProfile',
    {
        id: uuid('id').primaryKey().notNull().defaultRandom(),
        organizationId: uuid('organizationId'),
        userId: uuid('userId'),
        name: text('name').notNull(),
        photo: text('photo'),
        createdAt: timestamp('createdAt').notNull().defaultNow(),
        updatedAt: timestamp('updatedAt').notNull().defaultNow(),
    },
    (table) => {
        return {
            organizationIdIdx: index('user_profile_organization_id_idx').on(table.organizationId),
        };
    },
);
