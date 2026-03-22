import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { McpServer, McpServerCreateInput, McpServerUpdateInput } from '../dto';
import type { McpServerRepository } from '../repositories/McpServerRepository';
import { McpServerService } from './McpServerService';

describe('McpServerService', () => {
    let repository: McpServerRepository;

    beforeEach(() => {
        repository = {
            getAll: vi.fn(),
            getAllEnabled: vi.fn(),
            getById: vi.fn(),
            getByName: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        } as unknown as McpServerRepository;
    });

    it('passes through getter methods', async () => {
        const now = new Date();
        const server: McpServer = {
            id: 'server-id',
            name: 'Server',
            description: null,
            transportType: 'sse',
            config: { url: 'https://example.com' },
            enabled: true,
            createdAt: now,
            updatedAt: now,
        };
        (repository.getAll as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([server]);
        (repository.getAllEnabled as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([server]);
        (repository.getById as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(server);
        (repository.getByName as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(server);

        const service = new McpServerService(repository);

        await expect(service.getAll()).resolves.toEqual([server]);
        await expect(service.getAllEnabled()).resolves.toEqual([server]);
        await expect(service.getById('server-id')).resolves.toEqual(server);
        await expect(service.getByName('Server')).resolves.toEqual(server);

        expect(repository.getAll).toHaveBeenCalledTimes(1);
        expect(repository.getAllEnabled).toHaveBeenCalledTimes(1);
        expect(repository.getById).toHaveBeenCalledWith('server-id');
        expect(repository.getByName).toHaveBeenCalledWith('Server');
    });

    it('trims required fields when creating a server', async () => {
        const now = new Date();
        const created: McpServer = {
            id: 'created-id',
            name: 'My Server',
            description: null,
            transportType: 'sse',
            config: { url: 'https://example.com/sse' },
            enabled: true,
            createdAt: now,
            updatedAt: now,
        };
        (repository.create as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(created);

        const service = new McpServerService(repository);
        const input: McpServerCreateInput = {
            name: '  My Server  ',
            description: null,
            transportType: '  sse ',
            config: { url: 'https://example.com/sse' },
            enabled: true,
        };

        await expect(service.create(input)).resolves.toEqual(created);
        expect(repository.create).toHaveBeenCalledWith({
            ...input,
            name: 'My Server',
            transportType: 'sse',
        });
    });

    it.each([
        [
            'name is empty',
            {
                name: '   ',
                description: null,
                transportType: 'sse',
                config: { url: 'https://example.com/sse' },
                enabled: true,
            } satisfies McpServerCreateInput,
            'Name is required.',
        ],
        [
            'transport type is empty',
            {
                name: 'Server',
                description: null,
                transportType: '   ',
                config: { url: 'https://example.com/sse' },
                enabled: true,
            } satisfies McpServerCreateInput,
            'Transport Type is required.',
        ],
        [
            'transport config is missing',
            {
                name: 'Server',
                description: null,
                transportType: 'sse',
                config: null as unknown as McpServerCreateInput['config'],
                enabled: true,
            },
            'Transport config is required and must be an object.',
        ],
        [
            'transport type is invalid',
            {
                name: 'Server',
                description: null,
                transportType: 'ftp',
                config: {},
                enabled: true,
            } as unknown as McpServerCreateInput,
            'Invalid transport type: ftp. Must be one of: sse, http, stdio.',
        ],
        [
            'sse transport missing url',
            {
                name: 'Server',
                description: null,
                transportType: 'sse',
                config: {},
                enabled: true,
            } as unknown as McpServerCreateInput,
            'SSE transport requires a valid URL.',
        ],
        [
            'http transport missing url',
            {
                name: 'Server',
                description: null,
                transportType: 'http',
                config: {},
                enabled: true,
            } as unknown as McpServerCreateInput,
            'HTTP transport requires a valid URL.',
        ],
        [
            'stdio transport missing command',
            {
                name: 'Server',
                description: null,
                transportType: 'stdio',
                config: {},
                enabled: true,
            } as unknown as McpServerCreateInput,
            'Stdio transport requires a valid command.',
        ],
        [
            'stdio transport args must be an array',
            {
                name: 'Server',
                description: null,
                transportType: 'stdio',
                config: { command: 'echo', args: 'not-array' },
                enabled: true,
            } as unknown as McpServerCreateInput,
            'Stdio transport args must be an array.',
        ],
        [
            'stdio transport env must be an object',
            {
                name: 'Server',
                description: null,
                transportType: 'stdio',
                config: { command: 'echo', env: 'not-object' },
                enabled: true,
            } as unknown as McpServerCreateInput,
            'Stdio transport env must be an object.',
        ],
    ])('rejects create when %s', async (_label, input, message) => {
        const service = new McpServerService(repository);

        await expect(service.create(input)).rejects.toThrow(message);
        expect(repository.create).not.toHaveBeenCalled();
    });

    it('accepts stdio transport with optional config', async () => {
        const now = new Date();
        const created: McpServer = {
            id: 'created-stdio',
            name: 'Stdio Server',
            description: null,
            transportType: 'stdio',
            config: { command: 'echo', args: ['hello'], env: { HELLO: 'world' }, cwd: '/tmp' },
            enabled: true,
            createdAt: now,
            updatedAt: now,
        };
        (repository.create as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(created);

        const service = new McpServerService(repository);
        const input: McpServerCreateInput = {
            name: 'Stdio Server',
            description: null,
            transportType: 'stdio',
            config: { command: 'echo', args: ['hello'], env: { HELLO: 'world' }, cwd: '/tmp' },
            enabled: true,
        };

        await expect(service.create(input)).resolves.toEqual(created);
    });

    it('normalizes updates and validates config using provided transport type', async () => {
        const now = new Date();
        const updated: McpServer = {
            id: 'server-id',
            name: 'Updated Name',
            description: null,
            transportType: 'http',
            config: { url: 'https://example.com/http' },
            enabled: true,
            createdAt: now,
            updatedAt: now,
        };
        (repository.update as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(updated);

        const service = new McpServerService(repository);
        const updates: McpServerUpdateInput = {
            name: '  Updated Name  ',
            transportType: '  http ',
            config: { url: 'https://example.com/http' },
        };

        await expect(service.update('server-id', updates)).resolves.toEqual(updated);
        expect(repository.getById).not.toHaveBeenCalled();
        expect(repository.update).toHaveBeenCalledWith('server-id', {
            ...updates,
            name: 'Updated Name',
            transportType: 'http',
        });
    });

    it('validates config using existing transport type when updating config only', async () => {
        const now = new Date();
        const existing: McpServer = {
            id: 'server-id',
            name: 'Existing',
            description: null,
            transportType: 'sse',
            config: { url: 'https://example.com/sse' },
            enabled: true,
            createdAt: now,
            updatedAt: now,
        };
        (repository.getById as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(existing);
        (repository.update as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
            ...existing,
            config: { url: 'https://example.com/new-sse' },
            updatedAt: now,
        });

        const service = new McpServerService(repository);

        await expect(
            service.update('server-id', { config: { url: 'https://example.com/new-sse' } }),
        ).resolves.toBeDefined();
        expect(repository.getById).toHaveBeenCalledWith('server-id');
        expect(repository.update).toHaveBeenCalledWith('server-id', { config: { url: 'https://example.com/new-sse' } });
    });

    it('rejects update when transport type cannot be determined for config validation', async () => {
        (repository.getById as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

        const service = new McpServerService(repository);

        await expect(service.update('server-id', { config: { url: 'https://example.com/sse' } })).rejects.toThrow(
            'Cannot validate config: transport type not found.',
        );
        expect(repository.update).not.toHaveBeenCalled();
    });

    it.each([
        ['name is blank', { name: '   ' } as unknown as McpServerUpdateInput, 'Name is required.'],
        [
            'transport type is blank',
            { transportType: '   ' } as unknown as McpServerUpdateInput,
            'Transport Type is required.',
        ],
    ])('rejects update when %s', async (_label, updates, message) => {
        const service = new McpServerService(repository);

        await expect(service.update('server-id', updates)).rejects.toThrow(message);
        expect(repository.update).not.toHaveBeenCalled();
    });

    it('enables, disables, and deletes servers', async () => {
        const now = new Date();
        const server: McpServer = {
            id: 'server-id',
            name: 'Server',
            description: null,
            transportType: 'sse',
            config: { url: 'https://example.com/sse' },
            enabled: true,
            createdAt: now,
            updatedAt: now,
        };

        (repository.update as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(server);

        const service = new McpServerService(repository);

        await expect(service.enable('server-id')).resolves.toEqual(server);
        await expect(service.disable('server-id')).resolves.toEqual(server);
        await service.delete('server-id');

        expect(repository.update).toHaveBeenCalledWith('server-id', { enabled: true });
        expect(repository.update).toHaveBeenCalledWith('server-id', { enabled: false });
        expect(repository.delete).toHaveBeenCalledWith('server-id');
    });
});
