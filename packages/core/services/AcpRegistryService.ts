import { execFile } from 'node:child_process';
import { rm } from 'node:fs/promises';
import { promisify } from 'node:util';
import { inject, injectable } from 'inversify';
import { z } from 'zod';
import { AcpAgentInstallStatusEnum, AcpAgentSourceEnum } from '../database/schema/acpAgentSchema';
import type { AcpAgentCreateInput, AcpRegistryAgent, AcpRegistryInstallInput, AcpRegistryView } from '../dto';
import { AcpAgentRepository } from '../repositories/AcpAgentRepository';
import { CORETYPES } from '../types/types';
import { AcpAgentService } from './AcpAgentService';
import { installAcpBinary } from './AcpBinaryInstaller';
import { ensureAcpNodeRuntime, nodeRuntimeEnv } from './AcpNodeRuntime';

const REGISTRY_CACHE_ID = 'latest';
const REGISTRY_URL = 'https://cdn.agentclientprotocol.com/registry/v1/latest/registry.json';
const INVALID_REGISTRY_MESSAGE = 'The ACP registry contains invalid data. Please try refreshing later.';
const execFileAsync = promisify(execFile);

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
    .loose();

const registrySchema = z
    .object({
        version: z.string().min(1),
        agents: z.array(registryAgentSchema),
    })
    .loose();

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
        const result = registrySchema.safeParse(await response.json());
        if (!result.success) {
            return { version: '', fetchedAt: null, agents: [], error: INVALID_REGISTRY_MESSAGE };
        }
        const parsed = result.data;
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
        const result = registrySchema.safeParse(cache.data);
        if (!result.success) {
            return { version: cache.version, fetchedAt: cache.fetchedAt, agents: [], error: INVALID_REGISTRY_MESSAGE };
        }
        return {
            version: cache.version,
            fetchedAt: cache.fetchedAt,
            agents: result.data.agents,
        };
    }

    // Prepare the package before marking the agent as installed.
    public async installFromRegistry(input: AcpRegistryInstallInput) {
        const registry = await this.getCachedOrRefresh();
        if (registry.error) {
            throw new Error(registry.error);
        }
        const agent = registry.agents.find((item) => {
            return item.id === input.registryId;
        });
        if (!agent) {
            throw new Error(`ACP registry agent ${input.registryId} not found.`);
        }
        if (
            !this.hasObject(agent.distribution.npx) &&
            !this.hasObject(agent.distribution.uvx) &&
            this.hasObject(agent.distribution.binary)
        ) {
            const binary = await installAcpBinary(agent.distribution.binary);
            try {
                return await this.acpAgentService.create({
                    name: agent.name,
                    description: agent.description ?? null,
                    source: AcpAgentSourceEnum.REGISTRY,
                    registryId: agent.id,
                    version: agent.version,
                    command: binary.command,
                    args: binary.args,
                    env: binary.env,
                    defaultCwd: input.defaultCwd ?? null,
                    authMethodId: input.authMethodId ?? null,
                    enabled: input.enabled ?? true,
                    installStatus: AcpAgentInstallStatusEnum.INSTALLED,
                    mcpServerIds: input.mcpServerIds ?? [],
                    metadata: agent as unknown as Record<string, unknown>,
                });
            } catch (error) {
                await rm(binary.directory, { recursive: true, force: true });
                throw error;
            }
        }
        const createInput = this.buildCreateInput(agent, input);
        await this.installPackage(createInput);
        return this.acpAgentService.create(createInput);
    }

    // Populate the runner's package cache without starting the agent itself.
    private async installPackage(input: AcpAgentCreateInput & { args: string[] }): Promise<void> {
        const packageName = input.command === 'npx' ? input.args[1] : input.args[0];
        if (input.command === 'npx') {
            const runtime = await ensureAcpNodeRuntime();
            await execFileAsync(
                runtime.node,
                [runtime.npm, 'exec', '--yes', `--package=${packageName}`, '--', runtime.node, '-e', ''],
                { env: { ...process.env, ...nodeRuntimeEnv(runtime) } },
            );
            return;
        }
        await execFileAsync('uvx', [`--from=${packageName}`, 'python', '-c', 'pass']);
    }

    private buildCreateInput(
        agent: AcpRegistryAgent,
        input: AcpRegistryInstallInput,
    ): AcpAgentCreateInput & { args: string[] } {
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

        throw new Error('This registry agent has no supported distribution.');
    }

    private hasObject(value: unknown): value is Record<string, unknown> {
        return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
    }
}
