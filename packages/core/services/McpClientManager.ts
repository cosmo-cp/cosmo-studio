import { inject, injectable } from "inversify";
import { createMCPClient, type MCPClient, type MCPTransport } from "@ai-sdk/mcp";
import type { ToolSet } from "ai";
import { CORETYPES } from "../types/types";
import { McpServerService } from "./McpServerService";
import { HttpTransportConfig, McpToolDefinition, SseTransportConfig, StdioTransportConfig } from "../dto";

interface McpClientInstance {
    client: MCPClient;
    serverId: string;
    serverName: string;
    toolApprovals: Record<string, boolean>;
}

@injectable()
export class McpClientManager {
    private clients: Map<string, McpClientInstance> = new Map();

    constructor(
        @inject(CORETYPES.McpServerService) private mcpServerService: McpServerService
    ) {
    }

    /**
     * Initialize all enabled MCP clients
     */
    public async initializeClients(): Promise<void> {
        const enabledServers = await this.mcpServerService.getAllEnabled();

        for (const server of enabledServers) {
            try {
                await this.createClient(server.id);
            } catch (error) {
                console.error(`Failed to initialize MCP client for server ${server.name}:`, error);
            }
        }
    }

    /**
     * Create and cache a client for a specific server
     */
    public async createClient(serverId: string): Promise<void> {
        // Check if client already exists
        if (this.clients.has(serverId)) {
            return;
        }

        const server = await this.mcpServerService.getById(serverId);
        if (!server) {
            throw new Error(`MCP server with ID ${serverId} not found.`);
        }

        if (!server.enabled) {
            throw new Error(`MCP server ${server.name} is disabled.`);
        }

        let client;

        switch (server.transportType) {
            case 'sse': {
                const config = server.config as SseTransportConfig;
                client = await createMCPClient({
                    transport: {
                        type: 'sse',
                        url: config.url,
                        headers: config.headers,
                    },
                });
                break;
            }
            case 'http': {
                const config = server.config as HttpTransportConfig;
                client = await createMCPClient({
                    transport: {
                        type: 'http',
                        url: config.url,
                        headers: config.headers,
                    },
                });
                break;
            }
            case 'stdio': {
                const config = server.config as StdioTransportConfig;
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                const {Experimental_StdioMCPTransport} = require("@ai-sdk/mcp/mcp-stdio") as {
                    Experimental_StdioMCPTransport: new (options: {
                        command: string;
                        args?: string[];
                        env?: Record<string, string>;
                        cwd?: string;
                    }) => unknown;
                };
                const stdioTransport = new Experimental_StdioMCPTransport({
                    command: config.command,
                    args: config.args,
                    env: config.env,
                    cwd: config.cwd,
                }) as unknown as MCPTransport;
                client = await createMCPClient({
                    transport: stdioTransport,
                });
                break;
            }
            default:
                throw new Error(`Unsupported transport type: ${server.transportType}`);
        }

        this.clients.set(serverId, {
            client,
            serverId: server.id,
            serverName: server.name,
            toolApprovals: (server.toolApprovals as Record<string, boolean>) ?? {},
        });
    }

    /**
     * Get a client by server ID
     */
    public getClient(serverId: string): MCPClient | undefined {
        return this.clients.get(serverId)?.client;
    }

    /**
     * Get all active clients
     */
    public getAllClients(): MCPClient[] {
        return Array.from(this.clients.values()).map(instance => instance.client);
    }

    /**
     * Get all tools from all active clients, applying per-tool needsApproval settings
     */
    public async getAllTools(): Promise<ToolSet> {
        const allTools: ToolSet = {};

        for (const instance of this.clients.values()) {
            try {
                const tools = await instance.client.tools();
                for (const [name, tool] of Object.entries(tools)) {
                    const needsApproval = instance.toolApprovals[name] ?? true;
                    allTools[name] = { ...tool, needsApproval };
                }
            } catch (error) {
                console.error(`Failed to get tools from MCP server ${instance.serverName}:`, error);
            }
        }

        return allTools;
    }

    /**
     * Remove a client from the cache
     */
    public async removeClient(serverId: string): Promise<void> {
        this.clients.delete(serverId);
    }

    /**
     * Refresh a client (remove and recreate)
     */
    public async refreshClient(serverId: string): Promise<void> {
        await this.removeClient(serverId);
        await this.createClient(serverId);
    }

    /**
     * Clear all clients
     */
    public clearAll(): void {
        this.clients.clear();
    }

    /**
     * Get tools for a specific server (serializable format for IPC)
     */
    public async getToolsForServer(serverId: string): Promise<McpToolDefinition[]> {
        const instance = this.clients.get(serverId);
        if (!instance) {
            return [];
        }

        try {
            const tools = await instance.client.tools();
            return Object.entries(tools).map(([name, tool]) => ({
                name,
                title: (tool as { title?: string }).title,
                description: (tool as { description?: string }).description,
            }));
        } catch (error) {
            console.error(`Failed to get tools from MCP server ${instance.serverName}:`, error);
            return [];
        }
    }

    /**
     * Get the count of active clients
     */
    public getClientCount(): number {
        return this.clients.size;
    }
}
