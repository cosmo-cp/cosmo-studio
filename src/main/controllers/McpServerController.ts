import { inject, injectable } from "inversify";
import { IpcController, IpcHandler } from "../ipc/Decorators";
import { CORETYPES } from "core/types/types";
import { McpServerService } from "core/services/McpServerService";
import { McpClientManager } from "core/services/McpClientManager";
import { Controller } from "./Controller";
import { McpServer, McpServerCreateInput, McpServerUpdateInput, McpToolDefinition } from "core/dto";

@injectable()
@IpcController("mcpServer")
export class McpServerController implements Controller {
    constructor(
        @inject(CORETYPES.McpServerService) private mcpServerService: McpServerService,
        @inject(CORETYPES.McpClientManager) private mcpClientManager: McpClientManager
    ) {
    }

    @IpcHandler("getAll")
    public async getAll(): Promise<McpServer[]> {
        return this.mcpServerService.getAll();
    }

    @IpcHandler("getAllEnabled")
    public async getAllEnabled(): Promise<McpServer[]> {
        return this.mcpServerService.getAllEnabled();
    }

    @IpcHandler("getById")
    public async getById(id: string): Promise<McpServer | undefined> {
        return this.mcpServerService.getById(id);
    }

    @IpcHandler("getByName")
    public async getByName(name: string): Promise<McpServer | undefined> {
        return this.mcpServerService.getByName(name);
    }

    @IpcHandler("create")
    public async create(data: McpServerCreateInput): Promise<McpServer> {
        const server = await this.mcpServerService.create(data);
        // Initialize the client if it's enabled
        if (server.enabled) {
            try {
                await this.mcpClientManager.createClient(server.id);
            } catch (error) {
                console.error(`Failed to initialize MCP client for server ${server.name}:`, error);
            }
        }
        return server;
    }

    @IpcHandler("update")
    public async update(id: string, updates: McpServerUpdateInput): Promise<McpServer> {
        const server = await this.mcpServerService.update(id, updates);
        // Refresh the client if it exists
        try {
            await this.mcpClientManager.refreshClient(id);
        } catch (error) {
            console.error(`Failed to refresh MCP client for server ${server.name}:`, error);
        }
        return server;
    }

    @IpcHandler("delete")
    public async delete(id: string): Promise<void> {
        await this.mcpClientManager.removeClient(id);
        return this.mcpServerService.delete(id);
    }

    @IpcHandler("enable")
    public async enable(id: string): Promise<McpServer> {
        const server = await this.mcpServerService.enable(id);
        // Initialize the client
        try {
            await this.mcpClientManager.createClient(id);
        } catch (error) {
            console.error(`Failed to initialize MCP client for server ${server.name}:`, error);
        }
        return server;
    }

    @IpcHandler("disable")
    public async disable(id: string): Promise<McpServer> {
        await this.mcpClientManager.removeClient(id);
        return this.mcpServerService.disable(id);
    }

    @IpcHandler("refreshClient")
    public async refreshClient(id: string): Promise<void> {
        await this.mcpClientManager.refreshClient(id);
    }

    @IpcHandler("getClientCount")
    public async getClientCount(): Promise<number> {
        return this.mcpClientManager.getClientCount();
    }

    @IpcHandler("getServerTools")
    public async getServerTools(id: string): Promise<McpToolDefinition[]> {
        return this.mcpClientManager.getToolsForServer(id);
    }

    @IpcHandler("updateToolApproval")
    public async updateToolApproval(serverId: string, toolName: string, needsApproval: boolean): Promise<McpServer> {
        const server = await this.mcpServerService.getById(serverId);
        if (!server) {
            throw new Error(`MCP server with ID ${serverId} not found.`);
        }

        const currentApprovals = (server.toolApprovals as Record<string, boolean>) ?? {};
        const updatedApprovals = { ...currentApprovals, [toolName]: needsApproval };

        const updated = await this.mcpServerService.update(serverId, { toolApprovals: updatedApprovals });

        // Refresh the cached client to pick up updated tool approvals
        try {
            await this.mcpClientManager.refreshClient(serverId);
        } catch (error) {
            console.error(`Failed to refresh MCP client for server ${server.name}:`, error);
        }

        return updated;
    }
}
