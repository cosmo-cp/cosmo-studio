import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AcpAgentRepository } from '../repositories/AcpAgentRepository';
import type { AcpAgentService } from './AcpAgentService';
import { installAcpBinary } from './AcpBinaryInstaller';
import { AcpRegistryService } from './AcpRegistryService';

vi.mock('./AcpNodeRuntime', () => {
    return {
        ensureAcpNodeRuntime: vi
            .fn()
            .mockResolvedValue({ node: '/runtime/node', npx: '/runtime/npx-cli.js', bin: '/runtime' }),
        nodeRuntimeEnv: vi.fn().mockReturnValue({ PATH: '/runtime' }),
    };
});

vi.mock('./AcpBinaryInstaller', () => {
    return { installAcpBinary: vi.fn() };
});

const { runPackage } = vi.hoisted(() => {
    return { runPackage: vi.fn() };
});
vi.mock('node:child_process', async () => {
    const { promisify } = await import('node:util');
    const execFile = Object.assign(vi.fn(), { [promisify.custom]: runPackage });
    return { execFile: execFile };
});

describe('AcpRegistryService', () => {
    let repository: AcpAgentRepository;
    let acpAgentService: AcpAgentService;

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    beforeEach(() => {
        runPackage.mockReset().mockResolvedValue({ stdout: '', stderr: '' });
        repository = {
            getRegistryCache: vi.fn(),
            upsertRegistryCache: vi.fn(),
        } as unknown as AcpAgentRepository;
        acpAgentService = {
            create: vi.fn().mockResolvedValue({ id: 'agent-id' }),
        } as unknown as AcpAgentService;
    });

    it('uses cached registry data when available', async () => {
        const fetchedAt = new Date('2026-01-01T00:00:00.000Z');
        (repository.getRegistryCache as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
            id: 'latest',
            version: 'v1',
            fetchedAt: fetchedAt,
            updatedAt: fetchedAt,
            data: {
                version: 'v1',
                agents: [
                    {
                        id: 'agent',
                        name: 'Agent',
                        version: '1.0.0',
                        distribution: { npx: { package: '@example/agent' } },
                    },
                ],
            },
        });

        const service = new AcpRegistryService(repository, acpAgentService);

        await expect(service.getCachedOrRefresh()).resolves.toEqual({
            version: 'v1',
            fetchedAt: fetchedAt,
            agents: [expect.objectContaining({ id: 'agent' })],
        });
    });

    it('returns a validation error without caching an invalid registry response', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: true,
                json: async () => {
                    return { version: 'v1', agents: [{}] };
                },
            }),
        );
        const service = new AcpRegistryService(repository, acpAgentService);

        await expect(service.refresh()).resolves.toEqual({
            version: '',
            fetchedAt: null,
            agents: [],
            error: 'The ACP registry contains invalid data. Please try refreshing later.',
        });
        expect(repository.upsertRegistryCache).not.toHaveBeenCalled();
    });

    it('reports invalid cached data and prevents installation', async () => {
        vi.mocked(repository.getRegistryCache).mockResolvedValue({
            id: 'latest',
            version: 'v1',
            fetchedAt: null,
            updatedAt: new Date(),
            data: {},
        } as never);
        const service = new AcpRegistryService(repository, acpAgentService);

        await expect(service.getCachedOrRefresh()).resolves.toMatchObject({
            version: 'v1',
            agents: [],
            error: 'The ACP registry contains invalid data. Please try refreshing later.',
        });
        await expect(service.installFromRegistry({ registryId: 'agent' })).rejects.toThrow(
            'The ACP registry contains invalid data',
        );
        expect(acpAgentService.create).not.toHaveBeenCalled();
    });

    it('builds install input for npx registry agents', async () => {
        (repository.getRegistryCache as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
            id: 'latest',
            version: 'v1',
            fetchedAt: null,
            updatedAt: null,
            data: {
                version: 'v1',
                agents: [
                    {
                        id: 'agent',
                        name: 'Agent',
                        version: '1.0.0',
                        description: 'Runs tasks',
                        distribution: { npx: { package: '@example/agent', args: ['--acp'], env: { TOKEN: 'x' } } },
                    },
                ],
            },
        });

        const service = new AcpRegistryService(repository, acpAgentService);
        await service.installFromRegistry({ registryId: 'agent', defaultCwd: '/tmp' });

        expect(runPackage).toHaveBeenCalledWith(
            '/runtime/node',
            ['/runtime/npx-cli.js', '--yes', '--package=@example/agent', '--', '/runtime/node', '-e', ''],
            expect.objectContaining({ env: expect.objectContaining({ PATH: '/runtime' }) }),
        );
        expect(runPackage.mock.invocationCallOrder[0]).toBeLessThan(
            vi.mocked(acpAgentService.create).mock.invocationCallOrder[0],
        );
        expect(acpAgentService.create).toHaveBeenCalledWith(
            expect.objectContaining({
                name: 'Agent',
                command: 'npx',
                args: ['-y', '@example/agent', '--acp'],
                env: { TOKEN: 'x' },
                defaultCwd: '/tmp',
            }),
        );
    });

    it('installs uvx packages before creating the agent and propagates installation failures', async () => {
        vi.mocked(repository.getRegistryCache).mockResolvedValue({
            data: {
                version: 'v1',
                agents: [
                    { id: 'agent', name: 'Agent', version: '1', distribution: { uvx: { package: 'example-agent' } } },
                ],
            },
        } as never);
        const service = new AcpRegistryService(repository, acpAgentService);
        runPackage.mockRejectedValueOnce(new Error('installation failed'));
        await expect(service.installFromRegistry({ registryId: 'agent' })).rejects.toThrow('installation failed');
        expect(acpAgentService.create).not.toHaveBeenCalled();
        await service.installFromRegistry({ registryId: 'agent' });
        expect(runPackage).toHaveBeenCalledWith('uvx', ['--from=example-agent', 'python', '-c', 'pass']);
        expect(acpAgentService.create).toHaveBeenCalledOnce();
    });

    it('installs binary distributions before saving the agent', async () => {
        (repository.getRegistryCache as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
            id: 'latest',
            version: 'v1',
            fetchedAt: null,
            updatedAt: null,
            data: {
                version: 'v1',
                agents: [
                    {
                        id: 'binary-agent',
                        name: 'Binary Agent',
                        version: '1.0.0',
                        distribution: { binary: { url: 'https://example.com/agent.tgz' } },
                    },
                ],
            },
        });

        const service = new AcpRegistryService(repository, acpAgentService);

        vi.mocked(installAcpBinary).mockRejectedValueOnce(new Error('download failed'));
        await expect(service.installFromRegistry({ registryId: 'binary-agent' })).rejects.toThrow('download failed');
        expect(acpAgentService.create).not.toHaveBeenCalled();
        vi.mocked(installAcpBinary).mockResolvedValue({
            command: '/tmp/agent',
            args: ['acp'],
            env: {},
            directory: '/tmp/agent-install',
        });
        await service.installFromRegistry({ registryId: 'binary-agent' });
        expect(acpAgentService.create).toHaveBeenCalledWith(
            expect.objectContaining({ command: '/tmp/agent', args: ['acp'] }),
        );
        expect(vi.mocked(installAcpBinary).mock.invocationCallOrder[0]).toBeLessThan(
            vi.mocked(acpAgentService.create).mock.invocationCallOrder[0],
        );
    });
});
