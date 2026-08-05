import { ipcRenderer } from 'electron';
import type { WorkflowCreateInput, WorkflowGraph, WorkflowRunInsert } from '../../../packages/core/dto';
import type { WorkflowApi } from '../contracts/workflow';

export const workflowApi: WorkflowApi = {
    list: (searchQuery: string | null) => {
        return ipcRenderer.invoke('workflow:list', searchQuery);
    },
    get: (id: string) => {
        return ipcRenderer.invoke('workflow:get', id);
    },
    create: (input: WorkflowCreateInput, graph: WorkflowGraph) => {
        return ipcRenderer.invoke('workflow:create', input, graph);
    },
    update: (id: string, updates: Partial<WorkflowCreateInput>) => {
        return ipcRenderer.invoke('workflow:update', id, updates);
    },
    delete: (id: string) => {
        return ipcRenderer.invoke('workflow:delete', id);
    },
    saveGraph: (id: string, graph: WorkflowGraph) => {
        return ipcRenderer.invoke('workflow:saveGraph', id, graph);
    },
    runStart: (input: WorkflowRunInsert) => {
        return ipcRenderer.invoke('workflow:run.start', input);
    },
    runCancel: (input: { runId: string; message?: string }) => {
        return ipcRenderer.invoke('workflow:run.cancel', input);
    },
    runGet: (input: { runId: string }) => {
        return ipcRenderer.invoke('workflow:run.get', input);
    },
};
