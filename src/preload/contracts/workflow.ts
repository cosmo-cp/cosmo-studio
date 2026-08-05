import type {
    Workflow,
    WorkflowCreateInput,
    WorkflowGraph,
    WorkflowRun,
    WorkflowRunInsert,
    WorkflowRunStatus,
    WorkflowVersion,
} from '../../../packages/core/dto';

export interface WorkflowApi {
    list(searchQuery: string | null): Promise<Workflow[]>;
    get(id: string): Promise<Workflow | undefined>;
    create(input: WorkflowCreateInput, graph: WorkflowGraph): Promise<Workflow>;
    update(id: string, updates: Partial<WorkflowCreateInput>): Promise<Workflow | undefined>;
    delete(id: string): Promise<void>;
    saveGraph(id: string, graph: WorkflowGraph): Promise<WorkflowVersion>;
    runStart(input: WorkflowRunInsert): Promise<WorkflowRun>;
    runCancel(input: { runId: string; message?: string }): Promise<WorkflowRun | undefined>;
    runGet(input: { runId: string }): Promise<WorkflowRunStatus | undefined>;
}
