import { boolean, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export enum AcpAgentSourceEnum {
    REGISTRY = 'registry',
    CUSTOM = 'custom',
}

export enum AcpAgentInstallStatusEnum {
    INSTALLED = 'installed',
    MANUAL_REQUIRED = 'manual_required',
    ERROR = 'error',
}

export const acpAgent = pgTable('AcpAgent', {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    name: text('name').notNull().unique(),
    description: text('description'),
    source: text('source').$type<AcpAgentSourceEnum>().notNull().default(AcpAgentSourceEnum.CUSTOM),
    registryId: text('registryId'),
    version: text('version'),
    command: text('command').notNull(),
    args: jsonb('args').$type<string[]>().notNull().default([]),
    env: jsonb('env').$type<Record<string, string>>().notNull().default({}),
    defaultCwd: text('defaultCwd'),
    authMethodId: text('authMethodId'),
    enabled: boolean('enabled').notNull().default(true),
    installStatus: text('installStatus')
        .$type<AcpAgentInstallStatusEnum>()
        .notNull()
        .default(AcpAgentInstallStatusEnum.INSTALLED),
    mcpServerIds: jsonb('mcpServerIds').$type<string[]>().notNull().default([]),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

export const acpRegistryCache = pgTable('AcpRegistryCache', {
    id: text('id').primaryKey().notNull(),
    version: text('version').notNull(),
    data: jsonb('data').notNull(),
    fetchedAt: timestamp('fetchedAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});
