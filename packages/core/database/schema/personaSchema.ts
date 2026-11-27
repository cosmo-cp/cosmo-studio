import { boolean, index, jsonb, pgTable, real, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

export const persona = pgTable(
    'Persona',
    {
        id: uuid('id').primaryKey().notNull().defaultRandom(),
        organizationId: uuid('organizationId'),
        userId: uuid('userId'),
        name: text('name').notNull(),
        description: text('description'),
        avatarUrl: text('avatar_url'),
        role: text('role'),
        details: text('details').notNull(),
        systemPrompt: text('system_prompt'),

        // Intelligence
        modelIdentifier: text('model_identifier'), // e.g. 'anthropic:claude-3-7-sonnet', null = use chat default
        temperature: real('temperature'),
        reasoningEffort: text('reasoning_effort'), // 'low' | 'medium' | 'high'

        // Skill Set
        skills: jsonb('skills').$type<string[]>().notNull().default([]), // skill names/ids

        // Tool Access
        toolAccessMode: text('tool_access_mode').notNull().default('all'), // 'all' | 'custom' | 'none'
        allowedMcpServers: jsonb('allowed_mcp_servers').$type<string[]>().notNull().default([]),
        allowedTools: jsonb('allowed_tools').$type<string[]>().notNull().default([]),
        webSearchEnabled: boolean('web_search_enabled').notNull().default(true),

        createdAt: timestamp('createdAt').notNull().defaultNow(),
        updatedAt: timestamp('updatedAt').notNull().defaultNow(),
    },
    (table) => {
        return {
            organizationIdIdx: index('persona_organization_id_idx').on(table.organizationId),
            orgNameUnique: unique('persona_org_name_unique').on(table.organizationId, table.name).nullsNotDistinct(),
        };
    },
);
