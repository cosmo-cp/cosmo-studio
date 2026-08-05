import type {
    McpServer,
    McpServerCreateInput,
    McpServerUpdateInput,
    McpToolDefinition,
} from '../../../packages/core/dto';
import { callRpc } from '../api/common';
import type { McpServerApi } from '../contracts/mcpServer';

export const mcpServerHttpApi: McpServerApi = {
    getAll: () => {
        return callRpc<McpServer[]>('mcpServer', 'getAll', []);
    },
    getAllEnabled: () => {
        return callRpc<McpServer[]>('mcpServer', 'getAllEnabled', []);
    },
    getById: (id: string) => {
        return callRpc<McpServer | undefined>('mcpServer', 'getById', [id]);
    },
    getByName: (name: string) => {
        return callRpc<McpServer | undefined>('mcpServer', 'getByName', [name]);
    },
    create: (data: McpServerCreateInput) => {
        return callRpc<McpServer>('mcpServer', 'create', [data]);
    },
    update: (id: string, updates: McpServerUpdateInput) => {
        return callRpc<McpServer>('mcpServer', 'update', [id, updates]);
    },
    delete: (id: string) => {
        return callRpc<void>('mcpServer', 'delete', [id]);
    },
    enable: (id: string) => {
        return callRpc<McpServer>('mcpServer', 'enable', [id]);
    },
    disable: (id: string) => {
        return callRpc<McpServer>('mcpServer', 'disable', [id]);
    },
    refreshClient: (id: string) => {
        return callRpc<void>('mcpServer', 'refreshClient', [id]);
    },
    getClientCount: () => {
        return callRpc<number>('mcpServer', 'getClientCount', []);
    },
    getServerTools: (id: string) => {
        return callRpc<McpToolDefinition[]>('mcpServer', 'getServerTools', [id]);
    },
    updateToolApproval: (serverId: string, toolName: string, needsApproval: boolean) => {
        return callRpc<McpServer>('mcpServer', 'updateToolApproval', [serverId, toolName, needsApproval]);
    },
};
