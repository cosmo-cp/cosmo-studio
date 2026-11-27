import { boolean, index, jsonb, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

export const mcpServer = pgTable(
    'McpServer',
    {
        id: uuid('id').primaryKey().notNull().defaultRandom(),
        organizationId: uuid('organizationId'),
        userId: uuid('userId'),
        name: text('name').notNull(),
        description: text('description'),
        transportType: text('transport_type').notNull(), // 'sse' | 'http' | 'stdio'
        config: jsonb('config').notNull(), // Transport-specific configuration
        enabled: boolean('enabled').notNull().default(true),
        toolApprovals: jsonb('tool_approvals').notNull().default({}), // Record<string, boolean> — per-tool needsApproval overrides (default: true)
        createdAt: timestamp('createdAt').notNull().defaultNow(),
        updatedAt: timestamp('updatedAt').notNull().defaultNow(),
    },
    (table) => {
        return {
            organizationIdIdx: index('mcp_server_organization_id_idx').on(table.organizationId),
            orgNameUnique: unique('mcp_server_org_name_unique').on(table.organizationId, table.name).nullsNotDistinct(),
        };
    },
);
