import { relations } from 'drizzle-orm';
import { index, jsonb, pgEnum, pgTable, text, timestamp, uuid, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { workspace } from './workspaceSchema';

export const taskStatusEnum = pgEnum('task_status', [
    'not_started',
    'in_progress',
    'done',
    'failed',
    'cancelled',
    'closed',
]);

export const taskCommentAuthorTypeEnum = pgEnum('task_comment_author_type', ['human', 'agent', 'system']);

export const task = pgTable(
    'Task',
    {
        id: uuid('id').primaryKey().notNull().defaultRandom(),
        title: text('title').notNull(),
        description: text('description').notNull(),
        status: taskStatusEnum('status').notNull().default('not_started'),
        workspacePath: text('workspacePath').notNull(),
        workspaceId: uuid('workspaceId').references(
            (): AnyPgColumn => {
                return workspace.id;
            },
            { onDelete: 'set null' },
        ),
        runtime: text('runtime').$type<'model' | 'agent'>().notNull().default('model'),
        provider: text('provider'),
        modelId: text('modelId'),
        agentId: uuid('agentId'),
        nextTaskId: uuid('nextTaskId').references(
            (): AnyPgColumn => {
                return task.id;
            },
            { onDelete: 'set null' },
        ),
        closedAt: timestamp('closedAt'),
        createdAt: timestamp('createdAt').notNull().defaultNow(),
        updatedAt: timestamp('updatedAt').notNull().defaultNow(),
    },
    (table) => {
        return {
            statusIdx: index('task_status_idx').on(table.status),
            workspaceIdx: index('task_workspace_path_idx').on(table.workspacePath),
            workspaceIdIdx: index('task_workspace_id_idx').on(table.workspaceId),
            updatedAtIdx: index('task_updated_at_idx').on(table.updatedAt),
            nextTaskIdIdx: index('task_next_task_id_idx').on(table.nextTaskId),
        };
    },
);

export const taskComment = pgTable(
    'TaskComment',
    {
        id: uuid('id').primaryKey().notNull().defaultRandom(),
        taskId: uuid('taskId')
            .notNull()
            .references(
                () => {
                    return task.id;
                },
                { onDelete: 'cascade' },
            ),
        authorType: taskCommentAuthorTypeEnum('authorType').notNull(),
        authorLabel: text('authorLabel').notNull(),
        content: text('content').notNull(),
        metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
        createdAt: timestamp('createdAt').notNull().defaultNow(),
    },
    (table) => {
        return {
            taskIdIdx: index('task_comment_task_id_idx').on(table.taskId),
            createdAtIdx: index('task_comment_created_at_idx').on(table.createdAt),
        };
    },
);

export const taskRelations = relations(task, ({ one, many }) => {
    return {
        workspace: one(workspace, {
            fields: [task.workspaceId],
            references: [workspace.id],
        }),
        nextTask: one(task, {
            fields: [task.nextTaskId],
            references: [task.id],
            relationName: 'TaskSuccessor',
        }),
        comments: many(taskComment),
    };
});

export const taskCommentRelations = relations(taskComment, ({ one }) => {
    return {
        task: one(task, {
            fields: [taskComment.taskId],
            references: [task.id],
        }),
    };
});
