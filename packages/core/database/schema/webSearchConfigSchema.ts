import { boolean, index, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

export enum WebSearchProviderTypeEnum {
    EXA = 'exa',
}

export const webSearchConfig = pgTable(
    'WebSearchConfig',
    {
        id: uuid('id').primaryKey().notNull().defaultRandom(),
        organizationId: uuid('organizationId'),
        userId: uuid('userId'),
        createdAt: timestamp('createdAt').notNull().defaultNow(),
        updatedAt: timestamp('updatedAt'),
        type: text('type').$type<WebSearchProviderTypeEnum>().notNull(),
        enabled: boolean('enabled').notNull().default(true),
        apiKey: text('apiKey').notNull(),
    },
    (table) => {
        return {
            organizationIdIdx: index('web_search_config_organization_id_idx').on(table.organizationId),
            orgTypeUnique: unique('web_search_config_org_type_unique')
                .on(table.organizationId, table.type)
                .nullsNotDistinct(),
        };
    },
);
