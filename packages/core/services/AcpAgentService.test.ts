import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AcpAgentInstallStatusEnum, AcpAgentSourceEnum } from '../database/schema/acpAgentSchema';
import type { AcpAgent, AcpAgentCreateInput } from '../dto';
import type { SecretStore } from '../platform/SecretStore';
import type { AcpAgentRepository } from '../repositories/AcpAgentRepository';
import { AcpAgentService } from './AcpAgentService';

describe('AcpAgentService', () => {
    let repository: AcpAgentRepository;
    let secretStore: SecretStore;
    const now = new Date('2026-01-01T00:00:00.000Z');

    const agent: AcpAgent = {
        id: 'agent-id',
        name: 'Agent',
        description: null,
        source: AcpAgentSourceEnum.CUSTOM,
        registryId: null,
        version: null,
        command: 'npx',
        args: ['-y', 'agent'],
        env: { TOKEN: 'encrypted:secret' },
        defaultCwd: '/tmp',
        authMethodId: null,
        enabled: true,
        installStatus: AcpAgentInstallStatusEnum.INSTALLED,
        mcpServerIds: [],
        metadata: {},
        createdAt: now,
        updatedAt: now,
    };

    beforeEach(() => {
        repository = {
            getAll: vi.fn().mockResolvedValue([agent]),
            getById: vi.fn().mockResolvedValue(agent),
            getByName: vi.fn().mockResolvedValue(undefined),
            getByRegistryId: vi.fn().mockResolvedValue(undefined),
            create: vi.fn().mockImplementation(async (input) => {
                return { ...agent, ...input };
            }),
            update: vi.fn().mockImplementation(async (_id, input) => {
                return { ...agent, ...input };
            }),
            delete: vi.fn(),
        } as unknown as AcpAgentRepository;
        secretStore = {
            encrypt: vi.fn((value: string) => {
                return `encrypted:${value}`;
            }),
            decrypt: vi.fn((value: string) => {
                return value.replace(/^encrypted:?/, '');
            }),
            isEncryptionAvailable: () => {
                return true;
            },
        };
    });

    it('redacts env values when listing agents', async () => {
        const service = new AcpAgentService(repository, secretStore);

        await expect(service.getAll()).resolves.toEqual([
            expect.objectContaining({
                id: 'agent-id',
                envKeys: ['TOKEN'],
            }),
        ]);
        expect(await service.getAll()).not.toHaveProperty('0.env');
    });

    it('encrypts env values and normalizes fields when creating agents', async () => {
        const service = new AcpAgentService(repository, secretStore);
        const input: AcpAgentCreateInput = {
            name: '  Agent  ',
            description: '',
            source: AcpAgentSourceEnum.CUSTOM,
            registryId: null,
            version: null,
            command: '  npx  ',
            args: ['-y', 'agent'],
            env: { TOKEN: 'plain' },
            defaultCwd: '  /tmp  ',
            authMethodId: '',
            enabled: true,
            installStatus: AcpAgentInstallStatusEnum.INSTALLED,
            mcpServerIds: [],
            metadata: {},
        };

        await service.create(input);

        expect(repository.create).toHaveBeenCalledWith(
            expect.objectContaining({
                name: 'Agent',
                description: null,
                command: 'npx',
                env: { TOKEN: 'encrypted:plain' },
                defaultCwd: '/tmp',
                authMethodId: null,
            }),
        );
    });

    it('returns decrypted runtime config only through runtime lookup', async () => {
        const service = new AcpAgentService(repository, secretStore);

        await expect(service.getRuntimeConfig('agent-id')).resolves.toEqual(
            expect.objectContaining({
                env: { TOKEN: 'secret' },
            }),
        );
    });

    it('does not re-encrypt stored env values when toggling agents', async () => {
        const service = new AcpAgentService(repository, secretStore);

        await service.disable('agent-id');

        expect(repository.update).toHaveBeenCalledWith(
            'agent-id',
            expect.objectContaining({
                enabled: false,
                env: { TOKEN: 'encrypted:secret' },
            }),
        );
        expect(secretStore.encrypt).not.toHaveBeenCalled();
    });

    it('rejects duplicate names and missing commands', async () => {
        (repository.getByName as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(agent);
        const service = new AcpAgentService(repository, secretStore);

        await expect(
            service.create({
                ...agent,
                id: undefined,
                createdAt: undefined,
                updatedAt: undefined,
            } as unknown as AcpAgentCreateInput),
        ).rejects.toThrow('Duplicate ACP agent name.');

        (repository.getByName as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
        await expect(
            service.create({
                ...agent,
                name: 'New Agent',
                command: ' ',
            } as unknown as AcpAgentCreateInput),
        ).rejects.toThrow('Command is required.');
    });
});
