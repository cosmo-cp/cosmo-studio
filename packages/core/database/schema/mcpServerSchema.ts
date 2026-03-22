import { boolean, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const mcpServer = pgTable('McpServer', {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    name: text('name').notNull().unique(),
    description: text('description'),
    transportType: text('transport_type').notNull(), // 'sse' | 'http' | 'stdio'
    config: jsonb('config').notNull(), // Transport-specific configuration
    enabled: boolean('enabled').notNull().default(true),
    toolApprovals: jsonb('tool_approvals').notNull().default({}), // Record<string, boolean> — per-tool needsApproval overrides (default: true)
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});
