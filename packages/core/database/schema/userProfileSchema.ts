import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const userProfile = pgTable('UserProfile', {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    name: text('name').notNull(),
    photo: text('photo'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});
