import {
    convertToModelMessages,
    ModelMessage,
    RetryError,
    smoothStream,
    stepCountIs,
    streamText,
    toUIMessageStream,
    type ToolSet,
    type UIMessageChunk,
} from 'ai';
import type { ChatSendMessageArgs } from 'core/dto';
import { getCoreLogger } from 'core/platform/CoreLogger';
import { ChatService } from 'core/services/ChatService';
import { McpClientManager } from 'core/services/McpClientManager';
import { MessageService } from 'core/services/MessageService';
import { ModelProviderService } from 'core/services/ModelProviderService';
import { PersonaService } from 'core/services/PersonaService';
import { WebSearchConfigService } from 'core/services/WebSearchConfigService';
import { WorkspaceService } from 'core/services/WorkspaceService';
import { CORETYPES } from 'core/types/types';
import { inject, injectable } from 'inversify';
import { TYPES } from '../types';
import { AcpAgentRuntimeService } from './AcpAgentRuntimeService';
import { ChatRunRegistry } from './ChatRunRegistry';
import { createExaWebSearchTool } from './ExaWebSearchTool';
import { WorkspaceExecutionLockService } from './WorkspaceExecutionLockService';

interface ChatStreamConfig {
    model: unknown;
    tools: ToolSet;
    hasTools: boolean;
    cleanup?: () => void;
}

@injectable()
export class ChatStreamingService {
    public readonly runs = new ChatRunRegistry();

    constructor(
        @inject(CORETYPES.ModelProviderService)
        private readonly modelProviderService: ModelProviderService,
        @inject(CORETYPES.MessageService)
        private readonly messageService: MessageService,
        @inject(CORETYPES.PersonaService)
        private readonly personaService: PersonaService,
        @inject(CORETYPES.McpClientManager)
        private readonly mcpClientManager: McpClientManager,
        @inject(CORETYPES.WebSearchConfigService)
        private readonly webSearchConfigService: WebSearchConfigService,
        @inject(TYPES.AcpAgentRuntimeService)
        private readonly acpAgentRuntimeService: AcpAgentRuntimeService,
        @inject(CORETYPES.ChatService)
        private readonly chatService: ChatService,
        @inject(TYPES.WorkspaceExecutionLockService)
        private readonly workspaceLockService: WorkspaceExecutionLockService,
        @inject(CORETYPES.WorkspaceService)
        private readonly workspaceService: WorkspaceService,
    ) {}

    // Build the model response stream once so Electron IPC and HTTP can deliver it differently.
    public async createMessageStream(
        args: ChatSendMessageArgs,
        abortSignal: AbortSignal,
    ): Promise<ReadableStream<UIMessageChunk>> {
        const existingChat = await this.chatService.getChatById(args.chatId);
        if (!existingChat) throw new Error('Chat does not exist');
        abortSignal.throwIfAborted();
        const runtime = args.runtime ?? 'model';
        if (runtime === 'model' && !args.modelIdentifier) {
            throw new Error('modelIdentifier is required but was not provided');
        }
        if (runtime === 'agent' && !args.agentId) {
            throw new Error('agentId is required but was not provided');
        }

        const modelMessages: ModelMessage[] = await convertToModelMessages(args.messages);
        const persona = args.personaId
            ? await this.personaService.getById(args.personaId)
            : args.personaName
              ? await this.personaService.getByName(args.personaName)
              : undefined;

        const lastUserMsg = args.messages[args.messages.length - 1];
        const txtMsg = lastUserMsg.parts.find((part) => {
            return part.type === 'text';
        })?.text;
        const rsnMsg = lastUserMsg.parts.find((part) => {
            return part.type === 'reasoning';
        })?.text;
        const persistedModelIdentifier = runtime === 'agent' ? `agent:${args.agentId}` : args.modelIdentifier;

        abortSignal.throwIfAborted();
        await this.messageService.createMessage({
            chatId: args.chatId,
            role: lastUserMsg.role,
            text: txtMsg ?? null,
            reasoning: rsnMsg ?? null,
            modelIdentifier: persistedModelIdentifier ?? null,
        });

        let targetWorkspaceId = args.workspaceId ?? existingChat.workspaceId ?? null;
        if (runtime === 'agent' && args.workspaceId && args.workspaceId !== existingChat.workspaceId) {
            await this.chatService.updateSelectedWorkspaceForChat(args.chatId, args.workspaceId);
            targetWorkspaceId = args.workspaceId;
        } else if (runtime === 'agent' && !targetWorkspaceId && args.agentCwd) {
            const ws = await this.workspaceService.getByCanonicalPath(args.agentCwd);
            if (ws) {
                targetWorkspaceId = ws.id;
                await this.chatService.updateSelectedWorkspaceForChat(args.chatId, ws.id);
            }
        }

        const streamConfig =
            runtime === 'agent'
                ? await this.buildAcpAgentStreamConfig(
                      args.agentId!,
                      args.agentCwd,
                      targetWorkspaceId,
                      args.chatId,
                      abortSignal,
                  )
                : await this.buildModelStreamConfig(args.modelIdentifier!);

        const result = streamText({
            // @ts-expect-error/type-does-not-exist
            model: streamConfig.model,
            instructions: persona?.details || undefined,
            messages: modelMessages,
            tools: streamConfig.tools,
            stopWhen: streamConfig.hasTools ? stepCountIs(5) : undefined,
            abortSignal: abortSignal,
            experimental_transform: smoothStream({ delayInMs: 30 }),
            onAbort: () => {
                streamConfig.cleanup?.();
            },
            onFinish: async (result) => {
                streamConfig.cleanup?.();
                await this.messageService.createMessage({
                    chatId: args.chatId,
                    role: 'assistant',
                    text: result.text ?? null,
                    reasoning: result.reasoningText ?? null,
                    modelIdentifier: persistedModelIdentifier ?? null,
                });
            },
            onError: (error) => {
                streamConfig.cleanup?.();
                getCoreLogger().error('Stream error:', error);
                if (RetryError.isInstance(error)) {
                    throw error.lastError;
                }
                throw error.error ?? error;
            },
        });

        return toUIMessageStream({
            stream: result.stream,
            sendReasoning: true,
            sendSources: true,
            messageMetadata: () => {
                return {
                    modelId: persistedModelIdentifier,
                };
            },
            onError: (error) => {
                streamConfig.cleanup?.();
                getCoreLogger().error('Failed during chat UI message stream:', error);
                if (error instanceof Error) {
                    return error.message;
                }
                return 'Stream Error';
            },
        });
    }

    private async buildModelStreamConfig(modelIdentifier: string): Promise<ChatStreamConfig> {
        const modelProviderRegistry = await this.modelProviderService.getModelProviderRegistry();
        const tools = await this.buildTools();
        return {
            model: modelProviderRegistry.languageModel(modelIdentifier as `${string}:${string}`),
            tools: tools,
            hasTools: Object.keys(tools).length > 0,
        };
    }

    private async buildAcpAgentStreamConfig(
        agentId: string,
        cwd: string | null | undefined,
        workspaceId: string | null | undefined,
        chatId: string,
        abortSignal: AbortSignal,
    ): Promise<ChatStreamConfig> {
        let canonicalPath: string | null = null;

        if (workspaceId) {
            const ws = await this.workspaceService.get(workspaceId);
            if (ws) {
                canonicalPath = ws.canonicalPath;
            }
        } else if (cwd) {
            canonicalPath = cwd;
        }

        if (canonicalPath) {
            const reachability = await this.workspaceService.validateReachability(canonicalPath);
            if (!reachability.reachable) {
                throw new Error(reachability.error ?? `Workspace path is inaccessible: ${canonicalPath}`);
            }
            canonicalPath = reachability.canonicalPath!;
            this.workspaceLockService.acquireLease(canonicalPath, 'chat', chatId, abortSignal);
        }

        const provider = await this.acpAgentRuntimeService.createProvider(agentId, canonicalPath, chatId);
        provider.languageModel();
        const tools = (provider.tools ?? {}) as ToolSet;

        let cleanedUp = false;
        const cleanup = () => {
            if (cleanedUp) return;
            cleanedUp = true;
            if (canonicalPath) {
                this.workspaceLockService.releaseLease(canonicalPath, chatId);
            }
            provider.cleanup();
        };

        return {
            model: provider.languageModel(),
            tools: tools,
            hasTools: Object.keys(tools).length > 0,
            cleanup: cleanup,
        };
    }

    private async buildTools(): Promise<ToolSet> {
        const tools = await this.mcpClientManager.getAllTools();
        const exaConfig = await this.webSearchConfigService.getEnabledExaConfig();

        if (!exaConfig) {
            return tools;
        }

        return {
            ...tools,
            webSearch: createExaWebSearchTool({
                apiKey: exaConfig.apiKey,
            }),
        };
    }
}
