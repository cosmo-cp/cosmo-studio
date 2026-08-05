import { inject, injectable } from 'inversify';
import type { LanguageModelV3 } from '@ai-sdk/provider';
import type { ToolSet } from 'ai';
import { CORETYPES } from 'core/types/types';
import { AcpAgentService } from 'core/services/AcpAgentService';
import { McpServerService } from 'core/services/McpServerService';
import type {
    AcpAgentRuntimeConfig,
    AcpAgentTestResult,
    HttpTransportConfig,
    McpServer,
    SseTransportConfig,
    StdioTransportConfig,
} from 'core/dto';

interface ACPProvider {
    languageModel(modelId?: string, modeId?: string): LanguageModelV3;
    initSession(tools?: unknown): Promise<Record<string, unknown>>;
    authenticate(methodId?: string): Promise<void>;
    cleanup(): void;
    readonly tools?: ToolSet;
}

interface ACPProviderSettings {
    command: string;
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

@injectable()
export class AcpAgentRuntimeService {
    constructor(
        @inject(CORETYPES.AcpAgentService)
        private readonly acpAgentService: AcpAgentService,
        @inject(CORETYPES.McpServerService)
        private readonly mcpServerService: McpServerService,
    ) {}

    // Builds a one-shot ACP provider for a chat turn; callers must cleanup after streaming.
    public async createProvider(agentId: string, cwdOverride?: string | null): Promise<ACPProvider> {
        const agent = await this.acpAgentService.getRuntimeConfig(agentId);
        if (!agent.enabled) {
            throw new Error(`ACP agent ${agent.name} is disabled.`);
        }
        const cwd = (cwdOverride?.trim() || agent.defaultCwd || '').trim();
        if (!cwd) {
            throw new Error(`ACP agent ${agent.name} requires a workspace directory.`);
        }

        return createACPProvider({
            command: agent.command,
            args: agent.args,
            env: agent.env,
            authMethodId: agent.authMethodId ?? undefined,
            session: {
                cwd: cwd,
                mcpServers: await this.buildMcpServers(agent),
            },
        });
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
