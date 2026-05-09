import { inject, injectable } from 'inversify';
import { and, desc, eq, ilike, SQL } from 'drizzle-orm';
import { DatabaseManager } from '../database/DatabaseManager';
import { workflow, workflowVersion } from '../database/schema/schema';
import { CORETYPES } from '../types/types';
import { Workflow, WorkflowCreateInput, WorkflowGraph, WorkflowVersion } from '../dto';

@injectable()
export class WorkflowRepository {
    private db;

    constructor(@inject(CORETYPES.DatabaseManager) databaseManager: DatabaseManager) {
        this.db = databaseManager.getInstance();
    }

    // Fetches workflows with optional fuzzy matching for title and summary.
    public async getAll(searchQuery: string | null): Promise<Workflow[]> {
        const conditions: SQL[] = [];
        if (searchQuery?.trim()) {
            conditions.push(
                ilike(workflow.title, `%${searchQuery.trim()}%`),
            );
        }

        return this.db.select().from(workflow).where(and(...conditions)).orderBy(desc(workflow.updatedAt));
    }

    // Looks up a workflow by id for CRUD flows.
    public async getById(id: string): Promise<Workflow | undefined> {
        return this.db.query.workflow.findFirst({ where: eq(workflow.id, id) });
    }

    // Creates a workflow and stores its first graph version in one transaction.
    public async create(input: WorkflowCreateInput, graph: WorkflowGraph): Promise<Workflow> {
        return this.db.transaction(async (tx) => {
            const [createdWorkflow] = await tx.insert(workflow).values({
                title: input.title,
                summary: input.summary,
            }).returning();

            await tx.insert(workflowVersion).values({
                workflowId: createdWorkflow.id,
                version: 1,
                graph,
            });

            return createdWorkflow;
        });
    }

    // Updates mutable workflow metadata.
    public async update(id: string, updates: Partial<WorkflowCreateInput>): Promise<Workflow | undefined> {
        const [updated] = await this.db.update(workflow).set({ ...updates, updatedAt: new Date() }).where(eq(workflow.id, id)).returning();
        return updated;
    }

    // Deletes a workflow and cascades related versions/runs/events.
    public async delete(id: string): Promise<void> {
        await this.db.delete(workflow).where(eq(workflow.id, id));
    }

    // Creates the next immutable version for a workflow graph snapshot.
    public async createVersion(workflowId: string, graph: WorkflowGraph): Promise<WorkflowVersion> {
        return this.db.transaction(async (tx) => {
            const wf = await tx.query.workflow.findFirst({ where: eq(workflow.id, workflowId) });
            if (!wf) {
                throw new Error(`Workflow not found: ${workflowId}`);
            }
            const nextVersion = wf.latestVersion + 1;
            const [createdVersion] = await tx.insert(workflowVersion).values({
                workflowId,
                version: nextVersion,
                graph,
            }).returning();
            await tx.update(workflow).set({ latestVersion: nextVersion, updatedAt: new Date() }).where(eq(workflow.id, workflowId));
            return createdVersion;
        });
    }
}
