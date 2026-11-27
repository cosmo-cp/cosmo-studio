import { boolean, pgTable, text, uuid } from 'drizzle-orm/pg-core';

export const experimentalFlag = pgTable('ExperimentalFlag', {
    key: text('key').primaryKey(),
    organizationId: uuid('organizationId'),
    userId: uuid('userId'),
    enabled: boolean('enabled').notNull(),
});
