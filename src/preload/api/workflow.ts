import { ipcRenderer } from 'electron';
import type {
    Workflow,
    WorkflowCreateInput,
    WorkflowGraph,
    WorkflowRun,
    WorkflowRunInsert,
    WorkflowRunStatus,
    WorkflowVersion,
} from '../../../packages/core/dto';
import { callRpc } from './common';

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

export const workflowRpcApi: WorkflowApi = {
    list: (searchQuery: string | null) => ipcRenderer.invoke('workflow:list', searchQuery),
    get: (id: string) => ipcRenderer.invoke('workflow:get', id),
    create: (input: WorkflowCreateInput, graph: WorkflowGraph) => ipcRenderer.invoke('workflow:create', input, graph),
    update: (id: string, updates: Partial<WorkflowCreateInput>) => ipcRenderer.invoke('workflow:update', id, updates),
    delete: (id: string) => ipcRenderer.invoke('workflow:delete', id),
    saveGraph: (id: string, graph: WorkflowGraph) => ipcRenderer.invoke('workflow:saveGraph', id, graph),
    runStart: (input: WorkflowRunInsert) => ipcRenderer.invoke('workflow:run.start', input),
    runCancel: (input: { runId: string; message?: string }) => ipcRenderer.invoke('workflow:run.cancel', input),
    runGet: (input: { runId: string }) => ipcRenderer.invoke('workflow:run.get', input),
};

export const workflowHttpApi: WorkflowApi = {
    list: (searchQuery: string | null) => callRpc<Workflow[]>('workflow', 'list', [searchQuery]),
    get: (id: string) => callRpc<Workflow | undefined>('workflow', 'get', [id]),
    create: (input: WorkflowCreateInput, graph: WorkflowGraph) => callRpc<Workflow>('workflow', 'create', [input, graph]),
    update: (id: string, updates: Partial<WorkflowCreateInput>) => callRpc<Workflow | undefined>('workflow', 'update', [id, updates]),
    delete: (id: string) => callRpc<void>('workflow', 'delete', [id]),
    saveGraph: (id: string, graph: WorkflowGraph) => callRpc<WorkflowVersion>('workflow', 'saveGraph', [id, graph]),
    runStart: (input: WorkflowRunInsert) => callRpc<WorkflowRun>('workflow', 'run.start', [input]),
    runCancel: (input: {
        runId: string;
        message?: string
    }) => callRpc<WorkflowRun | undefined>('workflow', 'run.cancel', [input]),
    runGet: (input: { runId: string }) => callRpc<WorkflowRunStatus | undefined>('workflow', 'run.get', [input]),
};
