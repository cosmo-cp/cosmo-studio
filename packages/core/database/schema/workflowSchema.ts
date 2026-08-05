import { relations } from 'drizzle-orm';
import { integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

export const workflowStatus = pgEnum('workflow_status', ['active', 'archived']);
export const workflowRunStatus = pgEnum('workflow_run_status', [
    'queued',
    'running',
    'waiting_approval',
    'completed',
    'failed',
    'cancelled',
]);

export const workflowRunEventType = pgEnum('workflow_run_event_type', [
    'created',
    'started',
    'progress',
    'waiting_approval',
    'completed',
    'failed',
    'cancelled',
]);

export const workflow = pgTable('Workflow', {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    title: text('title').notNull(),
    summary: text('summary'),
    status: workflowStatus('status').notNull().default('active'),
    latestVersion: integer('latestVersion').notNull().default(1),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

export const workflowVersion = pgTable(
    'WorkflowVersion',
    {
        id: uuid('id').primaryKey().notNull().defaultRandom(),
        workflowId: uuid('workflowId')
            .notNull()
            .references(
                () => {
                    return workflow.id;
                },
                { onDelete: 'cascade' },
            ),
        version: integer('version').notNull(),
        graph: jsonb('graph').notNull(),
        createdAt: timestamp('createdAt').notNull().defaultNow(),
        updatedAt: timestamp('updatedAt').notNull().defaultNow(),
    },
    (table) => {
        return {
            workflowVersionPerWorkflow: uniqueIndex('workflow_version_workflow_id_version_idx').on(
                table.workflowId,
                table.version,
            ),
        };
    },
);

export const workflowRun = pgTable('WorkflowRun', {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    workflowId: uuid('workflowId')
        .notNull()
        .references(
            () => {
                return workflow.id;
            },
            { onDelete: 'cascade' },
        ),
    workflowVersionId: uuid('workflowVersionId')
        .notNull()
        .references(
            () => {
                return workflowVersion.id;
            },
            { onDelete: 'restrict' },
        ),
    status: workflowRunStatus('status').notNull().default('queued'),
    startedAt: timestamp('startedAt'),
    completedAt: timestamp('completedAt'),
    errorMessage: text('errorMessage'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

export const workflowRunEvent = pgTable('WorkflowRunEvent', {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    workflowRunId: uuid('workflowRunId')
        .notNull()
        .references(
            () => {
                return workflowRun.id;
            },
            { onDelete: 'cascade' },
        ),
    eventType: workflowRunEventType('eventType').notNull(),
    status: workflowRunStatus('status'),
    message: text('message'),
    payload: jsonb('payload'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
});

export const workflowRelations = relations(workflow, ({ many }) => {
    return {
        versions: many(workflowVersion),
        runs: many(workflowRun),
    };
});

export const workflowVersionRelations = relations(workflowVersion, ({ one, many }) => {
    return {
        workflow: one(workflow, {
            fields: [workflowVersion.workflowId],
            references: [workflow.id],
        }),
        runs: many(workflowRun),
    };
});

export const workflowRunRelations = relations(workflowRun, ({ one, many }) => {
    return {
        workflow: one(workflow, {
            fields: [workflowRun.workflowId],
            references: [workflow.id],
        }),
        version: one(workflowVersion, {
            fields: [workflowRun.workflowVersionId],
            references: [workflowVersion.id],
        }),
        events: many(workflowRunEvent),
    };
});

export const workflowRunEventRelations = relations(workflowRunEvent, ({ one }) => {
    return {
        workflowRun: one(workflowRun, {
            fields: [workflowRunEvent.workflowRunId],
            references: [workflowRun.id],
        }),
    };
});
