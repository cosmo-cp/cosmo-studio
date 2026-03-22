import { convertToModelMessages, ModelMessage, RetryError, smoothStream, streamText } from 'ai';
import { IpcMainEvent, WebContents } from 'electron';
import { inject, injectable } from 'inversify';
import { IpcController, IpcOn, IpcRendererOn } from '../ipc/Decorators';
import { ChatAbortArgs, ChatSendMessageArgs } from 'core/dto';
import { Controller } from './Controller';
import { CORETYPES } from 'core/types/types';
import { ModelProviderService } from 'core/services/ModelProviderService';
import { MessageService } from 'core/services/MessageService';
import { PersonaService } from 'core/services/PersonaService';
import { McpClientManager } from 'core/services/McpClientManager';
import { logger } from '../logger';

@injectable()
@IpcController('streamingChat')
export class StreamingChatController implements Controller {
    private readonly activeStreams = new Map<string, AbortController>();

    constructor(
        @inject(CORETYPES.ModelProviderService)
        private modelProviderService: ModelProviderService,
        @inject(CORETYPES.MessageService)
        private messageService: MessageService,
        @inject(CORETYPES.PersonaService)
        private personaService: PersonaService,
        @inject(CORETYPES.McpClientManager)
        private mcpClientManager: McpClientManager,
    ) {}

    @IpcOn('sendMessage')
    public async sendMessage(args: ChatSendMessageArgs, event: IpcMainEvent) {
        const modelProviderRegistry = await this.modelProviderService.getModelProviderRegistry();
        const webContents = event.sender as WebContents;
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

        const controller = new AbortController();
        this.activeStreams.set(args.streamChannel, controller);
        const lastUserMsg = args.messages[args.messages.length - 1];
        const txtMsg = lastUserMsg.parts.find((part) => part.type === 'text')?.text;
        const rsnMsg = lastUserMsg.parts.find((part) => part.type === 'reasoning')?.text;

        // Validate modelIdentifier before proceeding
        if (!args.modelIdentifier) {
            const errorMsg = 'modelIdentifier is required but was not provided';
            logger.error(errorMsg, args);
            if (!webContents.isDestroyed()) {
                webContents.send(`${args.streamChannel}-error`, { message: errorMsg });
            }
            return;
        }

        await this.messageService.createMessage({
            chatId: args.chatId,
            role: lastUserMsg.role,
            text: txtMsg ?? null,
            reasoning: rsnMsg ?? null,
            modelIdentifier: args.modelIdentifier,
        });
        try {
            const result = streamText({
                // @ts-expect-error/type-does-not-exist
                model: modelProviderRegistry.languageModel(args.modelIdentifier),
                messages: modelMessages,
                tools: await this.mcpClientManager.getAllTools(),
                abortSignal: controller.signal,
                experimental_transform: smoothStream({ delayInMs: 30 }),
                onFinish: (result) => {
                    this.messageService.createMessage({
                        chatId: args.chatId,
                        role: 'assistant',
                        text: result.text ?? null,
                        reasoning: result.reasoningText ?? null,
                        modelIdentifier: args.modelIdentifier,
                    });
                    this.activeStreams.delete(args.streamChannel);
                    if (!webContents.isDestroyed()) {
                        webContents.send(`${args.streamChannel}-end`);
                    }
                },
                onAbort: () => {
                    this.activeStreams.delete(args.streamChannel);
                },
                onError: (error) => {
                    logger.error('Stream error:', error);
                    let msg = error.error;
                    if (RetryError.isInstance(error)) {
                        msg = error.lastError;
                    }
                    if (!webContents.isDestroyed()) {
                        webContents.send(`${args.streamChannel}-error`, msg);
                    }
                    controller.abort();
                    this.activeStreams.delete(args.streamChannel);
                },
            });

            if (!webContents.isDestroyed()) {
                webContents.send(`${args.streamChannel}-data`, {
                    type: 'message-metadata',
                    messageMetadata: {
                        modelId: args.modelIdentifier,
                    },
                });
            }

            for await (const chunk of result.toUIMessageStream({
                sendReasoning: true,
                sendSources: true,
            })) {
                if (webContents.isDestroyed()) {
                    logger.info('WebContents destroyed, stopping stream.');
                    controller.abort();
                    break;
                }
                webContents.send(`${args.streamChannel}-data`, chunk);
            }
        } catch (error) {
            logger.error('Failed to start streamText:', error);
            controller.abort();
            this.activeStreams.delete(args.streamChannel);
            if (!webContents.isDestroyed()) {
                webContents.send(`${args.streamChannel}-error`, error);
            }
        }
    }

    @IpcOn('abortMessage')
    public abortMessage(args: ChatAbortArgs) {
        const controller = this.activeStreams.get(args.streamChannel);
        if (controller) {
            controller.abort();
            this.activeStreams.delete(args.streamChannel);
            logger.info(`Aborted stream for channel: ${args.streamChannel}`);
        }
    }

    @IpcRendererOn('data')
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public onData(channel: string, listener: (data: unknown) => void): () => void {
        return () => {};
    }

    @IpcRendererOn('end')
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public onEnd(channel: string, listener: () => void): () => void {
        return () => {};
    }

    @IpcRendererOn('error')
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public onError(channel: string, listener: (error: unknown) => void): () => void {
        return () => {};
    }
}
