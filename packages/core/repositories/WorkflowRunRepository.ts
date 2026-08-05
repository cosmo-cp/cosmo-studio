import { inject, injectable } from 'inversify';
import { and, desc, eq } from 'drizzle-orm';
import { DatabaseManager } from '../database/DatabaseManager';
import { workflowRun, workflowRunEvent, workflowVersion } from '../database/schema/schema';
import { CORETYPES } from '../types/types';
import { WorkflowRun, WorkflowRunEvent, WorkflowRunEventInsert, WorkflowRunInsert } from '../dto';

@injectable()
export class WorkflowRunRepository {
    private db;

    constructor(@inject(CORETYPES.DatabaseManager) databaseManager: DatabaseManager) {
        this.db = databaseManager.getInstance();
    }

    // Creates a run record for workflow execution lifecycle tracking.
    public async create(input: WorkflowRunInsert): Promise<WorkflowRun> {
        let workflowVersionId = input.workflowVersionId;
        if (!workflowVersionId) {
            const latestVersion = await this.db.query.workflowVersion.findFirst({
                where: eq(workflowVersion.workflowId, input.workflowId),
                orderBy: desc(workflowVersion.version),
                columns: { id: true },
            });
            if (!latestVersion) {
                throw new Error('Workflow has no version to run');
            }
            workflowVersionId = latestVersion.id;
        }

        const matchingVersion = await this.db.query.workflowVersion.findFirst({
            where: and(eq(workflowVersion.id, workflowVersionId), eq(workflowVersion.workflowId, input.workflowId)),
            columns: { id: true },
        });

        if (!matchingVersion) {
            throw new Error('Workflow version does not belong to the provided workflow');
        }

        const [created] = await this.db
            .insert(workflowRun)
            .values({
                ...input,
                workflowVersionId: workflowVersionId,
            })
            .returning();
        return created;
    }

    // Fetches a run with its event timeline for status views.
    public async getById(id: string): Promise<(WorkflowRun & { events: WorkflowRunEvent[] }) | undefined> {
        return this.db.query.workflowRun.findFirst({
            where: eq(workflowRun.id, id),
            with: { events: { orderBy: desc(workflowRunEvent.createdAt) } },
        });
    }

    // Lists runs for a workflow ordered by recency.
    public async getByWorkflowId(workflowId: string): Promise<WorkflowRun[]> {
        return this.db
            .select()
            .from(workflowRun)
            .where(and(eq(workflowRun.workflowId, workflowId)))
            .orderBy(desc(workflowRun.createdAt));
    }

    // Persists run status changes and timestamps.
    public async updateStatus(
        id: string,
        status: WorkflowRun['status'],
        errorMessage?: string | null,
    ): Promise<WorkflowRun | undefined> {
        const now = new Date();
        const startedAt = status === 'running' ? now : undefined;
        const completedAt = ['completed', 'failed', 'cancelled'].includes(status) ? now : undefined;
        const [updated] = await this.db
            .update(workflowRun)
            .set({
                status: status,
                errorMessage: errorMessage ?? null,
                startedAt: startedAt,
                completedAt: completedAt,
                updatedAt: now,
            })
            .where(eq(workflowRun.id, id))
            .returning();
        return updated;
    }

    // Appends timeline events for auditability.
    public async addEvent(input: WorkflowRunEventInsert): Promise<WorkflowRunEvent> {
        const [event] = await this.db.insert(workflowRunEvent).values(input).returning();
        return event;
    }
}
