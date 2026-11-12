import { inject, injectable, optional } from 'inversify';
import { AcpAgentSourceEnum } from '../database/schema/acpAgentSchema';
import type { AcpAgent, AcpAgentCreateInput, AcpAgentRuntimeConfig, AcpAgentUpdateInput, AcpAgentView } from '../dto';
import { Base64SecretStore, type SecretStore } from '../platform/SecretStore';
import { AcpAgentRepository } from '../repositories/AcpAgentRepository';
import { WorkspaceRepository } from '../repositories/WorkspaceRepository';
import { CORETYPES } from '../types/types';
import { uninstallAcpBinary } from './AcpBinaryInstaller';

const normalizeRequired = (value: string | null | undefined, field: string): string => {
    if (!value || value.trim().length === 0) {
        throw new Error(`${field} is required.`);
    }
    return value.trim();
};

const normalizeStringList = (value: unknown, field: string): string[] => {
    if (value === undefined || value === null) {
        return [];
    }
    if (
        !Array.isArray(value) ||
        value.some((item) => {
            return typeof item !== 'string';
        })
    ) {
        throw new Error(`${field} must be an array of strings.`);
    }
    return value;
};

@injectable()
export class AcpAgentService {
    constructor(
        @inject(CORETYPES.AcpAgentRepository)
        private readonly repository: AcpAgentRepository,
        @inject(CORETYPES.SecretStore)
        private readonly secretStore: SecretStore = new Base64SecretStore(),
        @inject(CORETYPES.WorkspaceRepository)
        @optional()
        private readonly workspaceRepository?: WorkspaceRepository,
    ) {}

    // Lists agents without leaking encrypted environment values to the renderer.
    public async getAll(): Promise<AcpAgentView[]> {
        const agents = await this.repository.getAll();
        return agents.map((agent) => {
            return this.toView(agent);
        });
    }

    // Returns a single redacted agent record for management UI and chat selectors.
    public async getById(id: string): Promise<AcpAgentView | undefined> {
        const agent = await this.repository.getById(id);
        return agent ? this.toView(agent) : undefined;
    }

    public async getByName(name: string): Promise<AcpAgentView | undefined> {
        const agent = await this.repository.getByName(name);
        return agent ? this.toView(agent) : undefined;
    }

    // Provides decrypted runtime config only to backend services that spawn agents.
    public async getRuntimeConfig(id: string): Promise<AcpAgentRuntimeConfig> {
        const agent = await this.repository.getById(id);
        if (!agent) {
            throw new Error(`ACP agent with ID ${id} not found.`);
        }
        return {
            ...agent,
            env: this.decryptEnv(agent.env as Record<string, string>),
        };
    }

    public async create(input: AcpAgentCreateInput): Promise<AcpAgentView> {
        const existing = await this.repository.getByName(input.name);
        if (existing) {
            throw new Error('Duplicate ACP agent name.');
        }
        if (input.registryId) {
            const existingRegistryAgent = await this.repository.getByRegistryId(input.registryId);
            if (existingRegistryAgent) {
                throw new Error('This registry agent is already installed.');
            }
        }

        let defaultCwd = input.defaultCwd?.trim() || null;
        let defaultWorkspaceId = input.defaultWorkspaceId ?? null;

        if (defaultWorkspaceId && this.workspaceRepository) {
            const ws = await this.workspaceRepository.getById(defaultWorkspaceId);
            if (ws) {
                defaultCwd = ws.canonicalPath;
            }
        } else if (defaultCwd && this.workspaceRepository) {
            const ws = await this.workspaceRepository.findByCanonicalPath(defaultCwd);
            if (ws) {
                defaultWorkspaceId = ws.id;
            }
        }

        const created = await this.repository.create(
            this.normalizeInput({
                ...input,
                defaultCwd: defaultCwd,
                defaultWorkspaceId: defaultWorkspaceId,
            }),
        );
        return this.toView(created);
    }

    public async update(id: string, updates: AcpAgentUpdateInput): Promise<AcpAgentView> {
        const existing = await this.repository.getById(id);
        if (!existing) {
            throw new Error(`ACP agent with ID ${id} not found.`);
        }

        let defaultCwd = updates.defaultCwd !== undefined ? updates.defaultCwd?.trim() || null : existing.defaultCwd;
        let defaultWorkspaceId =
            updates.defaultWorkspaceId !== undefined
                ? (updates.defaultWorkspaceId ?? null)
                : existing.defaultWorkspaceId;

        if (updates.defaultWorkspaceId !== undefined && updates.defaultWorkspaceId && this.workspaceRepository) {
            const ws = await this.workspaceRepository.getById(updates.defaultWorkspaceId);
            if (ws) {
                defaultCwd = ws.canonicalPath;
            }
        } else if (updates.defaultCwd !== undefined && updates.defaultCwd && this.workspaceRepository) {
            const ws = await this.workspaceRepository.findByCanonicalPath(updates.defaultCwd);
            if (ws) {
                defaultWorkspaceId = ws.id;
            }
        }

        const normalized = this.normalizeInput(
            {
                ...existing,
                ...updates,
                defaultCwd: defaultCwd,
                defaultWorkspaceId: defaultWorkspaceId,
                env: updates.env ?? existing.env,
            } as AcpAgentCreateInput,
            { envIsEncrypted: updates.env === undefined },
        );
        const updated = await this.repository.update(id, normalized);
        return this.toView(updated);
    }

    // Remove app-owned binaries before deleting their registry record.
    public async delete(id: string): Promise<void> {
        const agent = await this.repository.getById(id);
        if (agent?.source === AcpAgentSourceEnum.REGISTRY) {
            await uninstallAcpBinary(agent.command);
        }
        await this.repository.delete(id);
    }

    public async enable(id: string): Promise<AcpAgentView> {
        return this.update(id, { enabled: true });
    }

    public async disable(id: string): Promise<AcpAgentView> {
        return this.update(id, { enabled: false });
    }

    private normalizeInput(
        input: AcpAgentCreateInput,
        options: { envIsEncrypted?: boolean } = {},
    ): AcpAgentCreateInput {
        const name = normalizeRequired(input.name, 'Name');
        const command = normalizeRequired(input.command, 'Command');
        const env =
            input.env && typeof input.env === 'object' && !Array.isArray(input.env)
                ? (input.env as Record<string, string>)
                : {};

        return {
            ...input,
            name: name,
            command: command,
            description: input.description?.trim() || null,
            registryId: input.registryId?.trim() || null,
            version: input.version?.trim() || null,
            args: normalizeStringList(input.args, 'Args'),
            env: options.envIsEncrypted ? env : this.encryptEnv(env),
            defaultCwd: input.defaultCwd?.trim() || null,
            defaultWorkspaceId: input.defaultWorkspaceId ?? null,
            authMethodId: input.authMethodId?.trim() || null,
            enabled: input.enabled ?? true,
            mcpServerIds: normalizeStringList(input.mcpServerIds, 'MCP server IDs'),
            metadata:
                input.metadata && typeof input.metadata === 'object' && !Array.isArray(input.metadata)
                    ? input.metadata
                    : {},
        };
    }

    private toView(agent: AcpAgent): AcpAgentView {
        const { env, ...rest } = agent;
        return {
            ...rest,
            envKeys: Object.keys((env as Record<string, string>) ?? {}).sort(),
        };
    }

    private encryptEnv(env: Record<string, string>): Record<string, string> {
        return Object.fromEntries(
            Object.entries(env)
                .filter(([key]) => {
                    return key.trim().length > 0;
                })
                .map(([key, value]) => {
                    return [key.trim(), this.secretStore.encrypt(String(value ?? ''))];
                }),
        );
    }

    private decryptEnv(env: Record<string, string>): Record<string, string> {
        return Object.fromEntries(
            Object.entries(env ?? {}).map(([key, value]) => {
                return [key, this.secretStore.decrypt(value)];
            }),
        );
    }
}
