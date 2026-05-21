import {ChatRequestOptions, ChatTransport, DefaultChatTransport, UIMessage, UIMessageChunk} from 'ai';

// Note: The global AbortSignal type is used directly, no import needed for modern browsers/environments.
// Note: The browser's native ReadableStream is used, no import needed.

export class IpcChatTransport implements ChatTransport<UIMessage> {
    reconnectToStream(
        options: {
            chatId: string;
        } & ChatRequestOptions,
    ): Promise<ReadableStream<UIMessageChunk> | null> {
        const chatId = options.chatId;
        const streamChannel = `chat-stream-${chatId}`;
        let cleanup = () => {
            window.api.streaming.removeListeners(streamChannel);
        };

        const stream = new ReadableStream<UIMessageChunk>({
            start(controller) {
                const onData = (chunk: unknown) => {
                    controller.enqueue(chunk as UIMessageChunk);
                };
                const onEnd = () => {
                    cleanup();
                    controller.close();
                };
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const onError = (err: any) => {
                    cleanup();
                    const msg = err?.error?.message || err?.message || err || 'Stream Error';
                    controller.error(new Error(msg));
                };

                cleanup = () => {
                    window.api.streaming.removeListeners(streamChannel);
                };

                window.api.streaming.onData(`${streamChannel}`, onData);
                window.api.streaming.onEnd(`${streamChannel}`, onEnd);
                window.api.streaming.onError(`${streamChannel}`, onError);
            },
            cancel() {
                cleanup();
            },
        });
        return Promise.resolve(stream);
    }

    async sendMessages(
        options: {
            trigger: 'submit-message' | 'regenerate-message';
            chatId: string;
            messageId: string | undefined;
            messages: UIMessage[];
            abortSignal: AbortSignal | undefined;
        } & ChatRequestOptions,
    ): Promise<ReadableStream<UIMessageChunk>> {
        const chatId = options.chatId;
        const streamChannel = `chat-stream-${chatId}`;
        let cleanup = () => {
            window.api.streaming.removeListeners(streamChannel);
        };

        // Get modelId from metadata or fetch from chat
        const metadata = options?.metadata as {
            modelId?: string;
            personaId?: string;
            runtime?: 'model' | 'agent';
            agentId?: string | null;
            agentCwd?: string | null;
        } | undefined;
        const runtime = metadata?.runtime ?? 'model';
        let modelId = metadata?.modelId;
        let personaId = metadata?.personaId;
        let agentId = metadata?.agentId ?? null;

        // Fallback: fetch from chat if not in metadata (e.g., tool approval continuation - modelId is not passed from sendMessage)
        if ((runtime === 'model' && !modelId) || (runtime === 'agent' && !agentId)) {
            try {
                const chat = await window.api.chat?.getChatById(chatId);
                if (!modelId && chat?.selectedProvider && chat?.selectedModelId) {
                    modelId = `${chat.selectedProvider}:${chat.selectedModelId}`;
                    personaId = personaId || chat.selectedPersonaId || undefined;
                }
                agentId = agentId || chat?.selectedAgentId || null;
            } catch (e) {
                console.error('Failed to fetch chat for model info:', e);
            }
        }

        if (runtime === 'model' && !modelId) {
            return Promise.reject(new Error('modelId is required'));
        }
        if (runtime === 'agent' && !agentId) {
            return Promise.reject(new Error('agentId is required'));
        }

        const stream = new ReadableStream<UIMessageChunk>({
            start(controller) {
                const abortSignal = options.abortSignal;

                const onData = (chunk: unknown) => {
                    controller.enqueue(chunk as UIMessageChunk);
                };
                const onEnd = () => {
                    cleanup();
                    controller.close();
                };
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const onError = (err: any) => {
                    cleanup();
                    // we don't know the structure of err, so being defensive
                    const msg = err?.error?.message || err?.message || err || 'Stream Error';
                    controller.error(new Error(msg));
                };
                const handleAbort = () => {
                    cleanup();
                    window.api.streaming.abortMessage({ streamChannel });
                    controller.error(new Error('Aborted by user'));
                };

                cleanup = () => {
                    window.api.streaming.removeListeners(streamChannel);
                    abortSignal?.removeEventListener('abort', handleAbort);
                };

                window.api.streaming.onData(`${streamChannel}`, onData);
                window.api.streaming.onEnd(`${streamChannel}`, onEnd);
                window.api.streaming.onError(`${streamChannel}`, onError);

                // Send to main process
                const messages = options.messages;

                try {
                    window.api.streaming.sendMessage({
                        chatId,
                        messages,
                        streamChannel,
                        modelIdentifier: modelId,
                        personaId,
                        runtime,
                        agentId,
                        agentCwd: metadata?.agentCwd ?? null,
                    });
                } catch (error) {
                    cleanup();
                    controller.error(error instanceof Error ? error : new Error('Failed to send message'));
                    return;
                }

                if (abortSignal) {
                    abortSignal.addEventListener('abort', handleAbort, { once: true });
                }
            },
            cancel() {
                // Preserve in-flight generation when the UI disconnects (e.g. switching chats).
                // Explicit user cancellation is handled via the abort signal path above.
                cleanup();
            },
        });
        return Promise.resolve(stream);
    }
}

export function createChatTransport(): ChatTransport<UIMessage> {
    const backend = process.env.NEXT_PUBLIC_COSMO_BACKEND ??
        process.env.NEXT_PUBLIC_CHAT_DATA_SOURCE ??
        "electron";

    if (backend === "http") {
        const apiBase = process.env.NEXT_PUBLIC_COSMO_API_BASE ?? "/api";
        const normalizedBase = apiBase.endsWith("/") ? apiBase.slice(0, -1) : apiBase;
        return new DefaultChatTransport({
            api: `${normalizedBase}/chat`,
            prepareSendMessagesRequest: (options) => ({
                body: {
                    ...options.body,
                    id: options.id,
                    messages: options.messages,
                    trigger: options.trigger,
                    messageId: options.messageId,
                    metadata: options.requestMetadata,
                },
            }),
        });
    }

    return new IpcChatTransport();
}
