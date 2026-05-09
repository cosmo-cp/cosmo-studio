import {
    convertToModelMessages,
    ModelMessage,
    RetryError,
    smoothStream,
    stepCountIs,
    streamText,
    type ToolSet,
    type UIMessageChunk,
} from "ai";
import {inject, injectable} from "inversify";
import {ChatSendMessageArgs} from "core/dto";
import {CORETYPES} from "core/types/types";
import {ModelProviderService} from "core/services/ModelProviderService";
import {MessageService} from "core/services/MessageService";
import {PersonaService} from "core/services/PersonaService";
import {McpClientManager} from "core/services/McpClientManager";
import {WebSearchConfigService} from "core/services/WebSearchConfigService";
import {getCoreLogger} from "core/platform/CoreLogger";

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
        private readonly webSearchConfigService: WebSearchConfigService
    ) {
    }

    // Build the model response stream once so Electron IPC and HTTP can deliver it differently.
    public async createMessageStream(
        args: ChatSendMessageArgs,
        abortSignal: AbortSignal
    ): Promise<ReadableStream<UIMessageChunk>> {
        if (!args.modelIdentifier) {
            throw new Error("modelIdentifier is required but was not provided");
        }

        const modelProviderRegistry = await this.modelProviderService.getModelProviderRegistry();
        const tools = await this.buildTools();
        const hasTools = Object.keys(tools).length > 0;
        const modelMessages: ModelMessage[] = await convertToModelMessages(args.messages);
        const persona = args.personaId
            ? await this.personaService.getById(args.personaId)
            : args.personaName
                ? await this.personaService.getByName(args.personaName)
                : undefined;

        if (persona?.details) {
            modelMessages.unshift({
                role: "system",
                content: persona.details,
            });
        }

        const lastUserMsg = args.messages[args.messages.length - 1];
        const txtMsg = lastUserMsg.parts.find(part => part.type === "text")?.text;
        const rsnMsg = lastUserMsg.parts.find(part => part.type === "reasoning")?.text;

        await this.messageService.createMessage({
            chatId: args.chatId,
            role: lastUserMsg.role,
            text: txtMsg ?? null,
            reasoning: rsnMsg ?? null,
            modelIdentifier: args.modelIdentifier,
        });

        const result = streamText({
            // @ts-expect-error/type-does-not-exist
            model: modelProviderRegistry.languageModel(args.modelIdentifier),
            messages: modelMessages,
            tools,
            stopWhen: hasTools ? stepCountIs(5) : undefined,
            abortSignal,
            experimental_transform: smoothStream({delayInMs: 30}),
            onFinish: (result) => {
                void this.messageService.createMessage({
                    chatId: args.chatId,
                    role: "assistant",
                    text: result.text ?? null,
                    reasoning: result.reasoningText ?? null,
                    modelIdentifier: args.modelIdentifier,
                });
            },
            onError: (error) => {
                getCoreLogger().error("Stream error:", error);
                if (RetryError.isInstance(error)) {
                    throw error.lastError;
                }
                throw error.error ?? error;
            },
        });

        return result.toUIMessageStream({
            sendReasoning: true,
            sendSources: true,
            messageMetadata: () => ({
                modelId: args.modelIdentifier,
            }),
            onError: (error) => {
                getCoreLogger().error("Failed during chat UI message stream:", error);
                if (error instanceof Error) {
                    return error.message;
                }
                return "Stream Error";
            },
        });
    }

    private async buildTools(): Promise<ToolSet> {
        const tools = await this.mcpClientManager.getAllTools();
        const exaConfig = await this.webSearchConfigService.getEnabledExaConfig();

        if (!exaConfig) {
            return tools;
        }

        const {webSearch} = await import("@exalabs/ai-sdk");

        return {
            ...tools,
            webSearch: webSearch({
                apiKey: exaConfig.apiKey,
            }),
        };
    }
}
