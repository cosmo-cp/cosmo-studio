import { boolean, doublePrecision, index, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

export enum GuardrailDetectionModeEnum {
    HEURISTIC = 'heuristic',
    PATTERN = 'pattern',
}

export enum GuardrailActionModeEnum {
    REDACT = 'redact',
    BLOCK = 'block',
}

export type GuardrailDetectionMode = GuardrailDetectionModeEnum | 'heuristic' | 'pattern';
export type GuardrailActionMode = GuardrailActionModeEnum | 'redact' | 'block';

export const guardrailsConfig = pgTable(
    'GuardrailsConfig',
    {
        id: uuid('id').primaryKey().notNull().defaultRandom(),
        organizationId: uuid('organizationId'),
        userId: uuid('userId'),
        createdAt: timestamp('createdAt').notNull().defaultNow(),
        updatedAt: timestamp('updatedAt'),
        enabled: boolean('enabled').notNull().default(true),
        injectionEnabled: boolean('injectionEnabled').notNull().default(true),
        injectionMode: text('injectionMode')
            .$type<GuardrailDetectionMode>()
            .notNull()
            .default(GuardrailDetectionModeEnum.HEURISTIC),
        injectionThreshold: doublePrecision('injectionThreshold').notNull().default(0.7),
        leakageEnabled: boolean('leakageEnabled').notNull().default(true),
        leakageMode: text('leakageMode')
            .$type<GuardrailDetectionMode>()
            .notNull()
            .default(GuardrailDetectionModeEnum.HEURISTIC),
        leakageThreshold: doublePrecision('leakageThreshold').notNull().default(0.7),
        piiEnabled: boolean('piiEnabled').notNull().default(true),
        piiMode: text('piiMode').$type<GuardrailActionMode>().notNull().default(GuardrailActionModeEnum.REDACT),
        secretEnabled: boolean('secretEnabled').notNull().default(true),
        secretMode: text('secretMode').$type<GuardrailActionMode>().notNull().default(GuardrailActionModeEnum.BLOCK),
    },
    (table) => {
        return {
            organizationIdIdx: index('guardrails_config_organization_id_idx').on(table.organizationId),
            orgUnique: unique('guardrails_config_org_unique').on(table.organizationId).nullsNotDistinct(),
        };
    },
);

export type GuardrailsConfigEntity = typeof guardrailsConfig.$inferSelect;
export type GuardrailsConfigInsert = typeof guardrailsConfig.$inferInsert;
