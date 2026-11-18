import { boolean, pgTable, text } from 'drizzle-orm/pg-core';

export const experimentalFlag = pgTable('ExperimentalFlag', {
    key: text('key').primaryKey(),
    enabled: boolean('enabled').notNull(),
});
