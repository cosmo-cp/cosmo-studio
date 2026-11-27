import type { McpServer, McpServerCreateInput, McpServerUpdateInput } from 'core/dto';
import type { McpClientManager } from 'core/services/McpClientManager';
import type { McpServerService } from 'core/services/McpServerService';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { McpServerController } from './McpServerController';

describe('McpServerController', () => {
    let mcpServerService: McpServerService;
    let mcpClientManager: McpClientManager;
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
            createdAt: now,
            updatedAt: now,
            ...overrides,
        } as McpServer;
    };

    beforeEach(() => {
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        mcpServerService = {
            getAll: vi.fn(),
            getAllEnabled: vi.fn(),
            getById: vi.fn(),
            getByName: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
            enable: vi.fn(),
            disable: vi.fn(),
        } as unknown as McpServerService;
        mcpClientManager = {
            createClient: vi.fn(),
            refreshClient: vi.fn(),
            removeClient: vi.fn(),
            getClientCount: vi.fn(),
        } as unknown as McpClientManager;
    });

    it('delegates getters', async () => {
        const servers = [createServer({ id: 'a' })];
        (mcpServerService.getAll as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(servers);
        (mcpServerService.getAllEnabled as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(servers);
        (mcpServerService.getById as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(servers[0]);
        (mcpServerService.getByName as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(servers[0]);
        (mcpClientManager.getClientCount as unknown as ReturnType<typeof vi.fn>).mockReturnValue(2);

        const controller = new McpServerController(mcpServerService, mcpClientManager);

        await expect(controller.getAll()).resolves.toEqual(servers);
        await expect(controller.getAllEnabled()).resolves.toEqual(servers);
        await expect(controller.getById('a')).resolves.toEqual(servers[0]);
        await expect(controller.getByName('Server')).resolves.toEqual(servers[0]);
        await expect(controller.getClientCount()).resolves.toBe(2);
    });

    it('creates enabled servers and initializes their client', async () => {
        const server = createServer({ id: 's1', enabled: true });
        (mcpServerService.create as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(server);

        const controller = new McpServerController(mcpServerService, mcpClientManager);
        const input: McpServerCreateInput = {
            name: 'Server',
            description: null,
            transportType: 'sse',
            config: { url: 'https://example.com/sse' },
            enabled: true,
        };

        await expect(controller.create(input)).resolves.toEqual(server);
        expect(mcpServerService.create).toHaveBeenCalledWith(input);
        expect(mcpClientManager.createClient).toHaveBeenCalledWith('s1');
    });

    it('does not initialize a client when the created server is disabled', async () => {
        const server = createServer({ id: 's2', enabled: false });
        (mcpServerService.create as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(server);

        const controller = new McpServerController(mcpServerService, mcpClientManager);
        await controller.create({} as McpServerCreateInput);

        expect(mcpClientManager.createClient).not.toHaveBeenCalled();
    });

    it('logs and continues when client initialization fails', async () => {
        const server = createServer({ id: 's3', enabled: true, name: 'Bad' });
        (mcpServerService.create as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(server);
        (mcpClientManager.createClient as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('fail'));

        const controller = new McpServerController(mcpServerService, mcpClientManager);
        await expect(controller.create({} as McpServerCreateInput)).resolves.toEqual(server);
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Failed to initialize MCP client for server Bad:',
            expect.any(Error),
        );
    });

    it('updates servers and refreshes their client', async () => {
        const server = createServer({ id: 's4' });
        (mcpServerService.update as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(server);

        const controller = new McpServerController(mcpServerService, mcpClientManager);
        const updates: McpServerUpdateInput = { name: 'Updated' };
        await expect(controller.update('s4', updates)).resolves.toEqual(server);
        expect(mcpServerService.update).toHaveBeenCalledWith('s4', updates);
        expect(mcpClientManager.refreshClient).toHaveBeenCalledWith('s4');
    });

    it('logs and continues when client refresh fails', async () => {
        const server = createServer({ id: 's5', name: 'Refresh Fail' });
        (mcpServerService.update as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(server);
        (mcpClientManager.refreshClient as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('refresh'));

        const controller = new McpServerController(mcpServerService, mcpClientManager);
        await expect(controller.update('s5', {} as McpServerUpdateInput)).resolves.toEqual(server);
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Failed to refresh MCP client for server Refresh Fail:',
            expect.any(Error),
        );
    });

    it('removes clients before deleting servers', async () => {
        (mcpServerService.delete as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

        const controller = new McpServerController(mcpServerService, mcpClientManager);
        await controller.delete('server-id');

        expect(mcpClientManager.removeClient).toHaveBeenCalledWith('server-id');
        expect(mcpServerService.delete).toHaveBeenCalledWith('server-id');
    });

    it('enables servers and initializes their client', async () => {
        const server = createServer({ id: 's6' });
        (mcpServerService.enable as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(server);

        const controller = new McpServerController(mcpServerService, mcpClientManager);
        await expect(controller.enable('s6')).resolves.toEqual(server);
        expect(mcpClientManager.createClient).toHaveBeenCalledWith('s6');
    });

    it('logs and continues when enable client initialization fails', async () => {
        const server = createServer({ id: 's6b', name: 'Enable Fail' });
        (mcpServerService.enable as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(server);
        (mcpClientManager.createClient as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
            new Error('enable fail'),
        );

        const controller = new McpServerController(mcpServerService, mcpClientManager);
        await expect(controller.enable('s6b')).resolves.toEqual(server);
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Failed to initialize MCP client for server Enable Fail:',
            expect.any(Error),
        );
    });

    it('disables servers and removes their client', async () => {
        const server = createServer({ id: 's7' });
        (mcpServerService.disable as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(server);

        const controller = new McpServerController(mcpServerService, mcpClientManager);
        await expect(controller.disable('s7')).resolves.toEqual(server);
        expect(mcpClientManager.removeClient).toHaveBeenCalledWith('s7');
        expect(mcpServerService.disable).toHaveBeenCalledWith('s7');
    });

    it('delegates client management utilities', async () => {
        (mcpClientManager.refreshClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
        (mcpClientManager.getClientCount as unknown as ReturnType<typeof vi.fn>).mockReturnValue(3);

        const controller = new McpServerController(mcpServerService, mcpClientManager);
        await controller.refreshClient('server-id');
        expect(mcpClientManager.refreshClient).toHaveBeenCalledWith('server-id');

        await expect(controller.getClientCount()).resolves.toBe(3);
    });
});
