import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AcpAgentRepository } from '../repositories/AcpAgentRepository';
import type { AcpAgentService } from './AcpAgentService';
import { AcpRegistryService } from './AcpRegistryService';

describe('AcpRegistryService', () => {
    let repository: AcpAgentRepository;
    let acpAgentService: AcpAgentService;

    beforeEach(() => {
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

    it('rejects binary-only registry agents for v1 installs', async () => {
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

        await expect(service.installFromRegistry({ registryId: 'binary-agent' })).rejects.toThrow(
            'binary distributions',
        );
    });
});
