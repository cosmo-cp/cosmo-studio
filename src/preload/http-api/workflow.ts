import type {
    Workflow,
    WorkflowCreateInput,
    WorkflowGraph,
    WorkflowRun,
    WorkflowRunInsert,
    WorkflowRunStatus,
    WorkflowVersion,
} from '../../../packages/core/dto';
import { callRpc } from '../api/common';
import type { WorkflowApi } from '../contracts/workflow';

export const workflowHttpApi: WorkflowApi = {
    list: (searchQuery: string | null) => {
        return callRpc<Workflow[]>('workflow', 'list', [searchQuery]);
    },
    get: (id: string) => {
        return callRpc<Workflow | undefined>('workflow', 'get', [id]);
    },
    create: (input: WorkflowCreateInput, graph: WorkflowGraph) => {
        return callRpc<Workflow>('workflow', 'create', [input, graph]);
    },
    update: (id: string, updates: Partial<WorkflowCreateInput>) => {
        return callRpc<Workflow | undefined>('workflow', 'update', [id, updates]);
    },
    delete: (id: string) => {
        return callRpc<void>('workflow', 'delete', [id]);
    },
    saveGraph: (id: string, graph: WorkflowGraph) => {
        return callRpc<WorkflowVersion>('workflow', 'saveGraph', [id, graph]);
    },
    runStart: (input: WorkflowRunInsert) => {
        return callRpc<WorkflowRun>('workflow', 'run.start', [input]);
    },
    runCancel: (input: { runId: string; message?: string }) => {
        return callRpc<WorkflowRun | undefined>('workflow', 'run.cancel', [input]);
    },
    runGet: (input: { runId: string }) => {
        return callRpc<WorkflowRunStatus | undefined>('workflow', 'run.get', [input]);
    },
};
