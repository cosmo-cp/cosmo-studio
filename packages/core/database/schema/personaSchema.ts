import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const persona = pgTable('Persona', {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    name: text('name').notNull().unique(),
    details: text('details').notNull(),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});
