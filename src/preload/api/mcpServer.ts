import { ipcRenderer } from 'electron';
import type {McpServer, McpServerCreateInput, McpServerUpdateInput, McpToolDefinition} from '../../packages/core/dto';

export interface McpServerApi {
    getAll(): Promise<McpServer[]>;
    getAllEnabled(): Promise<McpServer[]>;
    getById(id: string): Promise<McpServer | undefined>;
    getByName(name: string): Promise<McpServer | undefined>;
    create(data: McpServerCreateInput): Promise<McpServer>;
    update(id: string, updates: McpServerUpdateInput): Promise<McpServer>;
    delete(id: string): Promise<void>;
    enable(id: string): Promise<McpServer>;
    disable(id: string): Promise<McpServer>;
    refreshClient(id: string): Promise<void>;
    getClientCount(): Promise<number>;
    getServerTools(id: string): Promise<McpToolDefinition[]>;
    updateToolApproval(serverId: string, toolName: string, needsApproval: boolean): Promise<McpServer>;
}

export const mcpServerApi: McpServerApi = {
    getAll: () => ipcRenderer.invoke('mcpServer:getAll'),
    getAllEnabled: () => ipcRenderer.invoke('mcpServer:getAllEnabled'),
    getById: (id: string) => ipcRenderer.invoke('mcpServer:getById', id),
    getByName: (name: string) => ipcRenderer.invoke('mcpServer:getByName', name),
    create: (data: McpServerCreateInput) => ipcRenderer.invoke('mcpServer:create', data),
    update: (id: string, updates: McpServerUpdateInput) => ipcRenderer.invoke('mcpServer:update', id, updates),
    delete: (id: string) => ipcRenderer.invoke('mcpServer:delete', id),
    enable: (id: string) => ipcRenderer.invoke('mcpServer:enable', id),
    disable: (id: string) => ipcRenderer.invoke('mcpServer:disable', id),
    refreshClient: (id: string) => ipcRenderer.invoke('mcpServer:refreshClient', id),
    getClientCount: () => ipcRenderer.invoke('mcpServer:getClientCount'),
    getServerTools: (id: string) => ipcRenderer.invoke('mcpServer:getServerTools', id),
    updateToolApproval: (serverId: string, toolName: string, needsApproval: boolean) => ipcRenderer.invoke('mcpServer:updateToolApproval', serverId, toolName, needsApproval)
};
