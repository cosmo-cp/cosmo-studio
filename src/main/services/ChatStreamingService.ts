import {
    convertToModelMessages,
    ModelMessage,
    RetryError,
    smoothStream,
    stepCountIs,
    streamText,
    type ToolSet,
    type UIMessageChunk,
} from 'ai';
import type { ChatSendMessageArgs } from 'core/dto';
import { getCoreLogger } from 'core/platform/CoreLogger';
import { McpClientManager } from 'core/services/McpClientManager';
import { MessageService } from 'core/services/MessageService';
import { ModelProviderService } from 'core/services/ModelProviderService';
import { PersonaService } from 'core/services/PersonaService';
import { WebSearchConfigService } from 'core/services/WebSearchConfigService';
import { CORETYPES } from 'core/types/types';
import { inject, injectable } from 'inversify';
import { TYPES } from '../types';
import { AcpAgentRuntimeService } from './AcpAgentRuntimeService';
import { createExaWebSearchTool } from './ExaWebSearchTool';

interface ChatStreamConfig {
    model: unknown;
    tools: ToolSet;
    hasTools: boolean;
    cleanup?: () => void;
}

@injectable()
export class ChatStreamingService {
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
    ) {}

    // Build the model response stream once so Electron IPC and HTTP can deliver it differently.
    public async createMessageStream(
        args: ChatSendMessageArgs,
        abortSignal: AbortSignal,
    ): Promise<ReadableStream<UIMessageChunk>> {
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

        if (persona?.details) {
            modelMessages.unshift({
                role: 'system',
                content: persona.details,
            });
        }

        const lastUserMsg = args.messages[args.messages.length - 1];
        const txtMsg = lastUserMsg.parts.find((part) => {
            return part.type === 'text';
        })?.text;
        const rsnMsg = lastUserMsg.parts.find((part) => {
            return part.type === 'reasoning';
        })?.text;
        const persistedModelIdentifier = runtime === 'agent' ? `agent:${args.agentId}` : args.modelIdentifier;

        await this.messageService.createMessage({
            chatId: args.chatId,
            role: lastUserMsg.role,
            text: txtMsg ?? null,
            reasoning: rsnMsg ?? null,
            modelIdentifier: persistedModelIdentifier ?? null,
        });

        const streamConfig =
            runtime === 'agent'
                ? await this.buildAcpAgentStreamConfig(args.agentId!, args.agentCwd)
                : await this.buildModelStreamConfig(args.modelIdentifier!);

        const result = streamText({
            // @ts-expect-error/type-does-not-exist
            model: streamConfig.model,
            messages: modelMessages,
            tools: streamConfig.tools,
            stopWhen: streamConfig.hasTools ? stepCountIs(5) : undefined,
            abortSignal: abortSignal,
            experimental_transform: smoothStream({ delayInMs: 30 }),
            onFinish: (result) => {
                streamConfig.cleanup?.();
                void this.messageService.createMessage({
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

        return result.toUIMessageStream({
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

    private async buildAcpAgentStreamConfig(agentId: string, cwd?: string | null): Promise<ChatStreamConfig> {
        const provider = await this.acpAgentRuntimeService.createProvider(agentId, cwd);
        provider.languageModel();
        const tools = (provider.tools ?? {}) as ToolSet;
        return {
            model: provider.languageModel(),
            tools: tools,
            hasTools: Object.keys(tools).length > 0,
            cleanup: () => {
                return provider.cleanup();
            },
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
