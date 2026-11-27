import type { WorkspaceApi } from 'contracts/contracts/workspace';
import type { WorkspaceCreateInput, WorkspaceUpdateInput } from 'core/dto';
import { ipcRenderer } from 'electron';

export const workspaceApi: WorkspaceApi = {
    list: () => {
        return ipcRenderer.invoke('workspace:list');
    },
    get: (id: string) => {
        return ipcRenderer.invoke('workspace:get', id);
    },
    create: (input: WorkspaceCreateInput) => {
        return ipcRenderer.invoke('workspace:create', input);
    },
    update: (id: string, input: WorkspaceUpdateInput) => {
        return ipcRenderer.invoke('workspace:update', id, input);
    },
    delete: (id: string) => {
        return ipcRenderer.invoke('workspace:delete', id);
    },
    pickFolder: () => {
        return ipcRenderer.invoke('workspace:pickFolder');
    },
    checkReachability: (id: string) => {
        return ipcRenderer.invoke('workspace:checkReachability', id);
    },
    checkAllReachability: () => {
        return ipcRenderer.invoke('workspace:checkAllReachability');
    },
};
