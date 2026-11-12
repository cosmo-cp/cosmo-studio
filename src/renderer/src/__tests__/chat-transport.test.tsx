import type { UIMessage } from 'ai';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IpcChatTransport } from '@/chat-transport';

type StreamingApiMock = {
    onData: ReturnType<typeof vi.fn>;
    onEnd: ReturnType<typeof vi.fn>;
    onError: ReturnType<typeof vi.fn>;
    removeListeners: ReturnType<typeof vi.fn>;
    sendMessage: ReturnType<typeof vi.fn>;
    abortMessage: ReturnType<typeof vi.fn>;
};

type ChatApiMock = {
    getChatById: ReturnType<typeof vi.fn>;
};

const createStreamingApiMock = (): StreamingApiMock => ({
    onData: vi.fn(),
    onEnd: vi.fn(),
    onError: vi.fn(),
    removeListeners: vi.fn(),
    sendMessage: vi.fn(),
    abortMessage: vi.fn(),
});

const createChatApiMock = (): ChatApiMock => ({
    getChatById: vi.fn().mockResolvedValue(undefined),
});

const setWindowApi = (streaming: StreamingApiMock, chat: ChatApiMock = createChatApiMock()) => {
    Object.defineProperty(window, 'api', {
        value: { streaming, chat },
        writable: true,
        configurable: true,
    });
};

describe('IpcChatTransport', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000000');
    });

    it('does not advertise unsupported reconnection', async () => {
        const transport = new IpcChatTransport();
        await expect(transport.reconnectToStream()).resolves.toBeNull();
    });

    it('removes listeners without aborting when send stream is canceled', async () => {
        const streaming = createStreamingApiMock();
        setWindowApi(streaming);

        const transport = new IpcChatTransport();
        const stream = await transport.sendMessages({
            trigger: 'submit-message',
            chatId: 'chat-2',
            messageId: undefined,
            messages: [] as UIMessage[],
            abortSignal: undefined,
            metadata: { modelId: 'openai:gpt-4o' },
        });

        expect(streaming.sendMessage).toHaveBeenCalledWith(
            expect.objectContaining({
                chatId: 'chat-2',
                streamChannel: 'chat-stream-chat-2-00000000-0000-4000-8000-000000000000',
                modelIdentifier: 'openai:gpt-4o',
            }),
        );

        await stream.getReader().cancel();

        expect(streaming.removeListeners).toHaveBeenCalledWith(
            'chat-stream-chat-2-00000000-0000-4000-8000-000000000000',
        );
        expect(streaming.abortMessage).not.toHaveBeenCalled();
    });

    it('surfaces sendMessage failures and cleans listeners', async () => {
        const streaming = createStreamingApiMock();
        streaming.sendMessage.mockImplementation(() => {
            throw new Error('send failed');
        });
        setWindowApi(streaming);

        const transport = new IpcChatTransport();
        const stream = await transport.sendMessages({
            trigger: 'submit-message',
            chatId: 'chat-3',
            messageId: undefined,
            messages: [] as UIMessage[],
            abortSignal: undefined,
            metadata: { modelId: 'openai:gpt-4o' },
        });

        await expect(stream.getReader().read()).rejects.toThrow('send failed');
        expect(streaming.removeListeners).toHaveBeenCalledWith(
            'chat-stream-chat-3-00000000-0000-4000-8000-000000000000',
        );
    });

    it('aborts streaming when the abort signal fires', async () => {
        const streaming = createStreamingApiMock();
        setWindowApi(streaming);

        const transport = new IpcChatTransport();
        const controller = new AbortController();
        await transport.sendMessages({
            trigger: 'submit-message',
            chatId: 'chat-5',
            messageId: undefined,
            messages: [] as UIMessage[],
            abortSignal: controller.signal,
            metadata: { modelId: 'openai:gpt-4o' },
        });

        controller.abort();

        expect(streaming.abortMessage).toHaveBeenCalledWith({
            streamChannel: 'chat-stream-chat-5-00000000-0000-4000-8000-000000000000',
        });
        expect(streaming.removeListeners).toHaveBeenCalledWith(
            'chat-stream-chat-5-00000000-0000-4000-8000-000000000000',
        );
    });
    it('fails early when model metadata is missing', async () => {
        const streaming = createStreamingApiMock();
        const chat = createChatApiMock();
        setWindowApi(streaming, chat);

        const transport = new IpcChatTransport();
        await expect(
            transport.sendMessages({
                trigger: 'submit-message',
                chatId: 'chat-4',
                messageId: undefined,
                messages: [] as UIMessage[],
                abortSignal: undefined,
                metadata: {} as never,
            }),
        ).rejects.toThrow('modelId is required');
        expect(chat.getChatById).toHaveBeenCalledWith('chat-4');
        expect(streaming.sendMessage).not.toHaveBeenCalled();
        expect(streaming.removeListeners).not.toHaveBeenCalled();
    });

    it('forwards workspaceId in sendMessage when metadata contains workspaceId', async () => {
        const streaming = createStreamingApiMock();
        setWindowApi(streaming);

        const transport = new IpcChatTransport();
        await transport.sendMessages({
            trigger: 'submit-message',
            chatId: 'chat-ws',
            messageId: undefined,
            messages: [] as UIMessage[],
            abortSignal: undefined,
            metadata: {
                runtime: 'agent',
                agentId: 'agent-1',
                workspaceId: 'ws-123',
            },
        });

        expect(streaming.sendMessage).toHaveBeenCalledWith(
            expect.objectContaining({
                chatId: 'chat-ws',
                runtime: 'agent',
                agentId: 'agent-1',
                workspaceId: 'ws-123',
            }),
        );
    });
});
