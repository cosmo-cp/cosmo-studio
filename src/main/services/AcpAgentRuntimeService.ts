import type { LanguageModelV3 } from '@ai-sdk/provider';
import type { ToolSet } from 'ai';
import type {
    AcpAgentRuntimeConfig,
    AcpAgentTestResult,
    HttpTransportConfig,
    McpServer,
    SseTransportConfig,
    StdioTransportConfig,
} from 'core/dto';
import { AcpAgentService } from 'core/services/AcpAgentService';
import { ensureAcpNodeRuntime, nodeRuntimeEnv } from 'core/services/AcpNodeRuntime';
import { McpServerService } from 'core/services/McpServerService';
import { CORETYPES } from 'core/types/types';
import { inject, injectable } from 'inversify';

interface ACPProvider {
    languageModel(modelId?: string, modeId?: string): LanguageModelV3;
    initSession(tools?: unknown): Promise<Record<string, unknown>>;
    authenticate(methodId?: string): Promise<void>;
    cleanup(): void;
    readonly tools?: ToolSet;
}

interface ACPProviderSettings {
    command: string;
    persistSession?: boolean;
    args?: string[];
    env?: Record<string, string>;
    authMethodId?: string;
    session: {
        cwd: string;
        mcpServers?: Record<string, unknown>[];
    };
}

// The package ships types under conditional exports that this CommonJS ts-node setup does not resolve.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createACPProvider } = require('@mcpc-tech/acp-ai-provider') as {
    createACPProvider: (config: ACPProviderSettings) => ACPProvider;
};

interface IdleProvider {
    provider: ACPProvider;
    timer: ReturnType<typeof setTimeout>;
}

const IDLE_TIMEOUT_MS = 5 * 60 * 1000;

@injectable()
export class AcpAgentRuntimeService {
    private readonly idleProviders = new Map<string, IdleProvider[]>();
    private readonly activeProviders = new Map<string, Set<ACPProvider>>();
    private readonly generations = new Map<string, number>();
    constructor(
        @inject(CORETYPES.AcpAgentService)
        private readonly acpAgentService: AcpAgentService,
        @inject(CORETYPES.McpServerService)
        private readonly mcpServerService: McpServerService,
    ) {}

    // Leases an initialized process exclusively until the caller releases it.
    public async createProvider(
        agentId: string,
        cwdOverride?: string | null,
        conversationId?: string,
    ): Promise<ACPProvider> {
        const generation = this.generations.get(agentId) ?? 0;
        const agent = await this.acpAgentService.getRuntimeConfig(agentId);
        if (!agent.enabled) {
            throw new Error(`ACP agent ${agent.name} is disabled.`);
        }
        const cwd = (cwdOverride?.trim() || agent.defaultCwd || '').trim();
        if (!cwd) {
            throw new Error(`ACP agent ${agent.name} requires a workspace directory.`);
        }

        const useNodeRuntime = agent.command === 'npx';
        const runtime = useNodeRuntime ? await ensureAcpNodeRuntime() : undefined;
        const settings: ACPProviderSettings = {
            command: runtime?.node ?? agent.command,
            persistSession: true,
            args: runtime ? [runtime.npx, ...agent.args] : agent.args,
            env: runtime ? nodeRuntimeEnv(runtime, agent.env) : agent.env,
            authMethodId: agent.authMethodId ?? undefined,
            session: {
                cwd: cwd,
                mcpServers: await this.buildMcpServers(agent),
            },
        };
        if ((this.generations.get(agentId) ?? 0) !== generation) {
            throw new Error('ACP agent was removed while starting.');
        }
        // A conversation owns its session history; concurrent turns get separate processes.
        const key = JSON.stringify([agentId, conversationId ?? null, settings]);
        const idle = this.idleProviders.get(key);
        const entry = idle?.pop();
        if (idle?.length === 0) {
            this.idleProviders.delete(key);
        }
        if (entry) {
            clearTimeout(entry.timer);
        }
        const provider = entry?.provider ?? this.createProcessProvider(settings);
        const active = this.activeProviders.get(agentId) ?? new Set<ACPProvider>();
        active.add(provider);
        this.activeProviders.set(agentId, active);
        try {
            await provider.initSession();
            if ((this.generations.get(agentId) ?? 0) !== generation) {
                throw new Error('ACP agent was removed while starting.');
            }
        } catch (error) {
            if (active.delete(provider)) provider.cleanup();
            if (active.size === 0 && this.activeProviders.get(agentId) === active) {
                this.activeProviders.delete(agentId);
            }
            throw error;
        }
        let released = false;
        return {
            languageModel: (modelId, modeId) => {
                return provider.languageModel(modelId, modeId);
            },
            initSession: (tools) => {
                return provider.initSession(tools);
            },
            authenticate: (methodId) => {
                return provider.authenticate(methodId);
            },
            get tools() {
                return provider.tools;
            },
            cleanup: () => {
                if (released) return;
                released = true;
                if (!active.delete(provider)) return;
                if (active.size === 0) this.activeProviders.delete(agentId);
                const timer = setTimeout(() => {
                    const entries = this.idleProviders.get(key);
                    const index =
                        entries?.findIndex((item) => {
                            return item.provider === provider;
                        }) ?? -1;
                    if (!entries || index < 0) return;
                    entries.splice(index, 1);
                    if (entries.length === 0) this.idleProviders.delete(key);
                    provider.cleanup();
                }, IDLE_TIMEOUT_MS);
                timer.unref();
                const entries = this.idleProviders.get(key) ?? [];
                entries.push({ provider: provider, timer: timer });
                this.idleProviders.set(key, entries);
            },
        };
    }

    // Stops every process for an agent before its installation is removed.
    public stopAgent(agentId: string): void {
        this.generations.set(agentId, (this.generations.get(agentId) ?? 0) + 1);
        const active = this.activeProviders.get(agentId);
        this.activeProviders.delete(agentId);
        if (active) {
            for (const provider of active) provider.cleanup();
            active.clear();
        }
        for (const [key, entries] of this.idleProviders) {
            if (JSON.parse(key)[0] !== agentId) continue;
            this.idleProviders.delete(key);
            for (const entry of entries) {
                clearTimeout(entry.timer);
                entry.provider.cleanup();
            }
        }
    }

    // Starts and tears down an ACP session to validate command/auth configuration.
    public async testAgent(agentId: string, cwdOverride?: string | null): Promise<AcpAgentTestResult> {
        let provider: ACPProvider | null = null;
        try {
            provider = await this.createProvider(agentId, cwdOverride);
            const session = await provider.initSession();
            const authMethods = Array.isArray((session as { authMethods?: unknown }).authMethods)
                ? (session as { authMethods: { id?: string }[] }).authMethods
                      .map((method) => {
                          return method.id;
                      })
                      .filter((id): id is string => {
                          return Boolean(id);
                      })
                : undefined;
            return {
                ok: true,
                message: 'ACP agent session initialized.',
                authMethods: authMethods,
            };
        } catch (error) {
            return {
                ok: false,
                message: error instanceof Error ? error.message : 'Failed to initialize ACP agent.',
            };
        } finally {
            provider?.cleanup();
        }
    }

    // Keeps subprocess construction isolated from lease management.
    protected createProcessProvider(settings: ACPProviderSettings): ACPProvider {
        return createACPProvider(settings);
    }

    private async buildMcpServers(agent: AcpAgentRuntimeConfig): Promise<Record<string, unknown>[]> {
        const serverIds = new Set(agent.mcpServerIds ?? []);
        if (serverIds.size === 0) {
            return [];
        }

        const servers = await Promise.all(
            [...serverIds].map((id) => {
                return this.mcpServerService.getById(id);
            }),
        );
        return servers
            .filter((server): server is McpServer => {
                return Boolean(server?.enabled);
            })
            .map((server) => {
                return this.mapMcpServer(server);
            });
    }

    private mapMcpServer(server: McpServer): Record<string, unknown> {
        if (server.transportType === 'stdio') {
            const config = server.config as StdioTransportConfig;
            return {
                type: 'stdio',
                name: server.name,
                command: config.command,
                args: config.args ?? [],
                env: config.env ?? {},
                cwd: config.cwd,
            };
        }
        if (server.transportType === 'http') {
            const config = server.config as HttpTransportConfig;
            return {
                type: 'http',
                name: server.name,
                url: config.url,
                headers: config.headers ?? {},
            };
        }
        const config = server.config as SseTransportConfig;
        return {
            type: 'sse',
            name: server.name,
            url: config.url,
            headers: config.headers ?? {},
        };
    }
}
