import type {
    McpServer,
    McpServerCreateInput,
    McpServerUpdateInput,
    McpToolDefinition,
} from '../../../packages/core/dto';

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
