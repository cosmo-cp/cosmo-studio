import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMCPClient } from '@ai-sdk/mcp';
import type { McpServer } from '../dto';
import type { McpServerService } from './McpServerService';
import { McpClientManager } from './McpClientManager';

vi.mock('@ai-sdk/mcp', () => ({
    createMCPClient: vi.fn(),
}));

describe('McpClientManager', () => {
    let mcpServerService: McpServerService;
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    const createServer = (overrides: Partial<McpServer> = {}): McpServer => {
        const now = new Date();
        return {
            id: 'server-id',
            name: 'Server',
            description: null,
            transportType: 'sse',
            config: { url: 'https://example.com/sse' },
            enabled: true,
            toolApprovals: {},
            createdAt: now,
            updatedAt: now,
            ...overrides,
        };
    };

    beforeEach(() => {
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        mcpServerService = {
            getAllEnabled: vi.fn(),
            getById: vi.fn(),
        } as unknown as McpServerService;
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    it('initializes enabled servers and continues after failures', async () => {
        (mcpServerService.getAllEnabled as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
            createServer({ id: 'a', name: 'A' }),
            createServer({ id: 'b', name: 'B' }),
        ]);

        const manager = new McpClientManager(mcpServerService);
        const createClientSpy = vi.spyOn(manager, 'createClient');
        createClientSpy.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce();

        await manager.initializeClients();

        expect(createClientSpy).toHaveBeenCalledWith('a');
        expect(createClientSpy).toHaveBeenCalledWith('b');
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Failed to initialize MCP client for server A:',
            expect.any(Error),
        );
    });

    it('creates and caches an SSE transport client', async () => {
        const client = { tools: vi.fn() };
        const server = createServer({
            id: 'sse-id',
            name: 'SSE Server',
            transportType: 'sse',
            config: { url: 'https://example.com/sse', headers: { Authorization: 'Bearer token' } },
        });

        (mcpServerService.getById as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(server);
        (createMCPClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(client);

        const manager = new McpClientManager(mcpServerService);

        await manager.createClient('sse-id');

        expect(createMCPClient).toHaveBeenCalledWith({
            transport: {
                type: 'sse',
                url: 'https://example.com/sse',
                headers: { Authorization: 'Bearer token' },
            },
        });
        expect(manager.getClient('sse-id')).toBe(client);
        expect(manager.getClientCount()).toBe(1);
    });

    it('creates an HTTP transport client', async () => {
        const client = { tools: vi.fn() };
        const server = createServer({
            id: 'http-id',
            name: 'HTTP Server',
            transportType: 'http',
            config: { url: 'https://example.com/http', headers: { Authorization: 'Bearer token' } },
        });

        (mcpServerService.getById as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(server);
        (createMCPClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(client);

        const manager = new McpClientManager(mcpServerService);

        await manager.createClient('http-id');

        expect(createMCPClient).toHaveBeenCalledWith({
            transport: {
                type: 'http',
                url: 'https://example.com/http',
                headers: { Authorization: 'Bearer token' },
            },
        });
        expect(manager.getClient('http-id')).toBe(client);
    });

    it('creates a stdio transport client', async () => {
        const client = { tools: vi.fn() };
        const server = createServer({
            id: 'stdio-id',
            name: 'Stdio Server',
            transportType: 'stdio',
            config: { command: 'echo', args: ['hello'], env: { HELLO: 'world' }, cwd: '/tmp' },
        });

        (mcpServerService.getById as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(server);
        (createMCPClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(client);

        const manager = new McpClientManager(mcpServerService);

        await manager.createClient('stdio-id');

        expect(createMCPClient).toHaveBeenCalledTimes(1);
        const callArg = (createMCPClient as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(callArg.transport).toMatchObject({
            serverParams: {
                command: 'echo',
                args: ['hello'],
                env: { HELLO: 'world' },
                cwd: '/tmp',
            },
        });
        expect(manager.getClient('stdio-id')).toBe(client);
    });

    it('does not recreate a cached client', async () => {
        const client = { tools: vi.fn() };
        const server = createServer({ id: 'cached-id', name: 'Cached' });

        (mcpServerService.getById as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(server);
        (createMCPClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(client);

        const manager = new McpClientManager(mcpServerService);

        await manager.createClient('cached-id');
        await manager.createClient('cached-id');

        expect(mcpServerService.getById).toHaveBeenCalledTimes(1);
        expect(createMCPClient).toHaveBeenCalledTimes(1);
        expect(manager.getClientCount()).toBe(1);
    });

    it('throws when the server is missing', async () => {
        (mcpServerService.getById as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
        const manager = new McpClientManager(mcpServerService);

        await expect(manager.createClient('missing-id')).rejects.toThrow('MCP server with ID missing-id not found.');
        expect(createMCPClient).not.toHaveBeenCalled();
    });

    it('throws when the server is disabled', async () => {
        const server = createServer({ id: 'disabled-id', name: 'Disabled', enabled: false });
        (mcpServerService.getById as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(server);

        const manager = new McpClientManager(mcpServerService);

        await expect(manager.createClient('disabled-id')).rejects.toThrow('MCP server Disabled is disabled.');
        expect(createMCPClient).not.toHaveBeenCalled();
    });

    it('throws for unsupported transport types', async () => {
        const server = createServer({ id: 'bad-id', transportType: 'weird' } as Partial<McpServer>);
        (mcpServerService.getById as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(server);

        const manager = new McpClientManager(mcpServerService);

        await expect(manager.createClient('bad-id')).rejects.toThrow('Unsupported transport type: weird');
        expect(createMCPClient).not.toHaveBeenCalled();
    });

    it('returns all active clients and tools with needsApproval defaulting to true', async () => {
        const serverById: Record<string, McpServer> = {
            a: createServer({ id: 'a', name: 'A', transportType: 'sse', config: { url: 'https://a' } }),
            b: createServer({ id: 'b', name: 'B', transportType: 'http', config: { url: 'https://b' } }),
        };
        (mcpServerService.getById as unknown as ReturnType<typeof vi.fn>).mockImplementation(
            async (id: string) => serverById[id],
        );

        const clientA = {
            tools: vi.fn().mockResolvedValue({ alpha: { execute: vi.fn() }, shared: { execute: vi.fn() } }),
        };
        const clientB = { tools: vi.fn().mockRejectedValue(new Error('tools failed')) };
        (createMCPClient as unknown as ReturnType<typeof vi.fn>)
            .mockResolvedValueOnce(clientA)
            .mockResolvedValueOnce(clientB);

        const manager = new McpClientManager(mcpServerService);
        await manager.createClient('a');
        await manager.createClient('b');

        expect(manager.getAllClients()).toEqual([clientA, clientB]);
        expect(manager.getClientCount()).toBe(2);

        const allTools = await manager.getAllTools();
        expect(allTools.alpha).toMatchObject({ needsApproval: true });
        expect(allTools.shared).toMatchObject({ needsApproval: true });
        expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to get tools from MCP server B:', expect.any(Error));
    });

    it('respects per-tool approval overrides from toolApprovals', async () => {
        const server = createServer({
            id: 'a',
            name: 'A',
            transportType: 'sse',
            config: { url: 'https://a' },
            toolApprovals: { alpha: false },
        });
        (mcpServerService.getById as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(server);

        const client = {
            tools: vi.fn().mockResolvedValue({ alpha: { execute: vi.fn() }, beta: { execute: vi.fn() } }),
        };
        (createMCPClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(client);

        const manager = new McpClientManager(mcpServerService);
        await manager.createClient('a');

        const allTools = await manager.getAllTools();
        expect(allTools.alpha).toMatchObject({ needsApproval: false });
        expect(allTools.beta).toMatchObject({ needsApproval: true });
    });

    it('refreshes and removes clients', async () => {
        const server = createServer({ id: 'id', name: 'Server' });
        (mcpServerService.getById as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(server);

        const client1 = { tools: vi.fn() };
        const client2 = { tools: vi.fn() };
        const client3 = { tools: vi.fn() };
        (createMCPClient as unknown as ReturnType<typeof vi.fn>)
            .mockResolvedValueOnce(client1)
            .mockResolvedValueOnce(client2)
            .mockResolvedValueOnce(client3);

        const manager = new McpClientManager(mcpServerService);
        await manager.createClient('id');
        expect(manager.getClient('id')).toBe(client1);

        await manager.refreshClient('id');
        expect(manager.getClient('id')).toBe(client2);

        await manager.removeClient('id');
        expect(manager.getClient('id')).toBeUndefined();
        expect(manager.getClientCount()).toBe(0);

        await manager.createClient('id');
        expect(manager.getClient('id')).toBe(client3);
        expect(manager.getClientCount()).toBe(1);

        manager.clearAll();
        expect(manager.getClientCount()).toBe(0);
    });
});
