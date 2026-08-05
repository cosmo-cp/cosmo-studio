import { ipcRenderer } from 'electron';
import type { McpServerCreateInput, McpServerUpdateInput } from '../../../packages/core/dto';
import type { McpServerApi } from '../contracts/mcpServer';

export const mcpServerApi: McpServerApi = {
    getAll: () => {
        return ipcRenderer.invoke('mcpServer:getAll');
    },
    getAllEnabled: () => {
        return ipcRenderer.invoke('mcpServer:getAllEnabled');
    },
    getById: (id: string) => {
        return ipcRenderer.invoke('mcpServer:getById', id);
    },
    getByName: (name: string) => {
        return ipcRenderer.invoke('mcpServer:getByName', name);
    },
    create: (data: McpServerCreateInput) => {
        return ipcRenderer.invoke('mcpServer:create', data);
    },
    update: (id: string, updates: McpServerUpdateInput) => {
        return ipcRenderer.invoke('mcpServer:update', id, updates);
    },
    delete: (id: string) => {
        return ipcRenderer.invoke('mcpServer:delete', id);
    },
    enable: (id: string) => {
        return ipcRenderer.invoke('mcpServer:enable', id);
    },
    disable: (id: string) => {
        return ipcRenderer.invoke('mcpServer:disable', id);
    },
    refreshClient: (id: string) => {
        return ipcRenderer.invoke('mcpServer:refreshClient', id);
    },
    getClientCount: () => {
        return ipcRenderer.invoke('mcpServer:getClientCount');
    },
    getServerTools: (id: string) => {
        return ipcRenderer.invoke('mcpServer:getServerTools', id);
    },
    updateToolApproval: (serverId: string, toolName: string, needsApproval: boolean) => {
        return ipcRenderer.invoke('mcpServer:updateToolApproval', serverId, toolName, needsApproval);
    },
};
