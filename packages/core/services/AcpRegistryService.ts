import { inject, injectable } from 'inversify';
import { z } from 'zod';
import { CORETYPES } from '../types/types';
import { AcpAgentRepository } from '../repositories/AcpAgentRepository';
import type { AcpAgentCreateInput, AcpRegistryAgent, AcpRegistryInstallInput, AcpRegistryView } from '../dto';
import { AcpAgentInstallStatusEnum, AcpAgentSourceEnum } from '../database/schema/acpAgentSchema';
import { AcpAgentService } from './AcpAgentService';

const REGISTRY_CACHE_ID = 'latest';
const REGISTRY_URL = 'https://cdn.agentclientprotocol.com/registry/v1/latest/registry.json';

const registryAgentSchema = z
    .object({
        id: z.string().min(1),
        name: z.string().min(1),
        version: z.string().min(1),
        description: z.string().optional(),
        repository: z.string().optional(),
        website: z.string().optional(),
        authors: z.array(z.string()).optional(),
        license: z.string().optional(),
        icon: z.string().optional(),
        distribution: z.record(z.string(), z.unknown()),
    })
    .passthrough();

const registrySchema = z
    .object({
        version: z.string().min(1),
        agents: z.array(registryAgentSchema),
    })
    .passthrough();

@injectable()
export class AcpRegistryService {
    constructor(
        @inject(CORETYPES.AcpAgentRepository)
        private readonly repository: AcpAgentRepository,
        @inject(CORETYPES.AcpAgentService)
        private readonly acpAgentService: AcpAgentService,
    ) {}

    // Fetches and caches the public registry so renderer search works offline after first load.
    public async refresh(): Promise<AcpRegistryView> {
        const response = await fetch(REGISTRY_URL, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch ACP registry: ${response.status}`);
        }
        const parsed = registrySchema.parse(await response.json());
        const cache = await this.repository.upsertRegistryCache({
            id: REGISTRY_CACHE_ID,
            version: parsed.version,
            data: parsed,
            fetchedAt: new Date(),
            updatedAt: new Date(),
        });
        return {
            version: cache.version,
            fetchedAt: cache.fetchedAt,
            agents: parsed.agents,
        };
    }

    // Returns cached registry data, refreshing from the public registry on first use.
    public async getCachedOrRefresh(): Promise<AcpRegistryView> {
        const cache = await this.repository.getRegistryCache(REGISTRY_CACHE_ID);
        if (!cache) {
            return this.refresh();
        }
        const parsed = registrySchema.parse(cache.data);
        return {
            version: cache.version,
            fetchedAt: cache.fetchedAt,
            agents: parsed.agents,
        };
    }

    public async installFromRegistry(input: AcpRegistryInstallInput) {
        const registry = await this.getCachedOrRefresh();
        const agent = registry.agents.find((item) => {
            return item.id === input.registryId;
        });
        if (!agent) {
            throw new Error(`ACP registry agent ${input.registryId} not found.`);
        }
        const createInput = this.buildCreateInput(agent, input);
        return this.acpAgentService.create(createInput);
    }

    private buildCreateInput(agent: AcpRegistryAgent, input: AcpRegistryInstallInput): AcpAgentCreateInput {
        const distribution = agent.distribution;

        if (this.hasObject(distribution.npx)) {
            const npx = distribution.npx as { package?: string; args?: string[]; env?: Record<string, string> };
            if (!npx.package) {
                throw new Error(`Registry agent ${agent.name} has an invalid npx distribution.`);
            }
            return {
                name: agent.name,
                description: agent.description ?? null,
                source: AcpAgentSourceEnum.REGISTRY,
                registryId: agent.id,
                version: agent.version,
                command: 'npx',
                args: ['-y', npx.package, ...(npx.args ?? [])],
                env: npx.env ?? {},
                defaultCwd: input.defaultCwd ?? null,
                authMethodId: input.authMethodId ?? null,
                enabled: input.enabled ?? true,
                installStatus: AcpAgentInstallStatusEnum.INSTALLED,
                mcpServerIds: input.mcpServerIds ?? [],
                metadata: agent as unknown as Record<string, unknown>,
            };
        }

        if (this.hasObject(distribution.uvx)) {
            const uvx = distribution.uvx as { package?: string; args?: string[]; env?: Record<string, string> };
            if (!uvx.package) {
                throw new Error(`Registry agent ${agent.name} has an invalid uvx distribution.`);
            }
            return {
                name: agent.name,
                description: agent.description ?? null,
                source: AcpAgentSourceEnum.REGISTRY,
                registryId: agent.id,
                version: agent.version,
                command: 'uvx',
                args: [uvx.package, ...(uvx.args ?? [])],
                env: uvx.env ?? {},
                defaultCwd: input.defaultCwd ?? null,
                authMethodId: input.authMethodId ?? null,
                enabled: input.enabled ?? true,
                installStatus: AcpAgentInstallStatusEnum.INSTALLED,
                mcpServerIds: input.mcpServerIds ?? [],
                metadata: agent as unknown as Record<string, unknown>,
            };
        }

        throw new Error('This registry agent only provides binary distributions. Add it as a custom agent for v1.');
    }

    private hasObject(value: unknown): value is Record<string, unknown> {
        return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
    }
}
