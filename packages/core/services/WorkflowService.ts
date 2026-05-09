import { inject, injectable } from 'inversify';
import { Workflow, WorkflowCreateInput, WorkflowGraph, WorkflowVersion } from '../dto';
import { WorkflowRepository } from '../repositories/WorkflowRepository';
import { CORETYPES } from '../types/types';

@injectable()
export class WorkflowService {
    constructor(@inject(CORETYPES.WorkflowRepository) private workflowRepository: WorkflowRepository) {}

    // Provides search and listing support for workflow catalog screens.
    public async getAllWorkflows(searchQuery: string | null): Promise<Workflow[]> {
        return this.workflowRepository.getAll(searchQuery);
    }

    // Loads a single workflow for details and editing contexts.
    public async getWorkflowById(id: string): Promise<Workflow | undefined> {
        return this.workflowRepository.getById(id);
    }

    // Creates a workflow plus its initial version snapshot.
    public async createWorkflow(input: WorkflowCreateInput, graph: WorkflowGraph): Promise<Workflow> {
        return this.workflowRepository.create(input, graph);
    }

    // Updates workflow metadata that is safe to change in-place.
    public async updateWorkflow(id: string, updates: Partial<WorkflowCreateInput>): Promise<Workflow | undefined> {
        return this.workflowRepository.update(id, updates);
    }

    // Removes a workflow and all dependent records.
    public async deleteWorkflow(id: string): Promise<void> {
        await this.workflowRepository.delete(id);
    }

    // Returns all version snapshots for a workflow.
    public async getWorkflowVersions(workflowId: string): Promise<WorkflowVersion[]> {
        return this.workflowRepository.getVersionsForWorkflow(workflowId);
    }

    // Produces a new immutable workflow version from a graph snapshot.
    public async createWorkflowVersion(workflowId: string, graph: WorkflowGraph): Promise<WorkflowVersion> {
        return this.workflowRepository.createVersion(workflowId, graph);
    }
}
