import {beforeEach, describe, expect, it, vi} from "vitest";
import type {ChatAbortArgs, ChatSendMessageArgs} from "core/dto";
import type {McpClientManager} from "core/services/McpClientManager";
import type {MessageService} from "core/services/MessageService";
import type {ModelProviderService} from "core/services/ModelProviderService";
import type {PersonaService} from "core/services/PersonaService";
import type {WebSearchConfigService} from "core/services/WebSearchConfigService";
import {setCoreLogger} from "core/platform/CoreLogger";
import type {AcpAgentRuntimeService} from "../services/AcpAgentRuntimeService";
import {ChatStreamingService} from "../services/ChatStreamingService";

const logger = vi.hoisted(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
}));

const ai = vi.hoisted(() => ({
    convertToModelMessages: vi.fn(),
    smoothStream: vi.fn(),
    stepCountIs: vi.fn((count: number) => `step:${count}`),
    streamText: vi.fn(),
    RetryError: {
        isInstance: vi.fn(() => false),
    },
}));

const exa = vi.hoisted(() => ({
    createExaWebSearchTool: vi.fn(() => "exa-tool"),
}));

vi.mock("../logger", () => ({
    logger,
}));

vi.mock("ai", () => ({
    convertToModelMessages: ai.convertToModelMessages,
    smoothStream: ai.smoothStream,
    stepCountIs: ai.stepCountIs,
    streamText: ai.streamText,
    RetryError: ai.RetryError,
}));

vi.mock("../services/ExaWebSearchTool", () => ({
    createExaWebSearchTool: exa.createExaWebSearchTool,
}));

import {StreamingChatController} from "./StreamingChatController";

type SendMessageEvent = Parameters<StreamingChatController["sendMessage"]>[1];
type WebContentsMock = {
    isDestroyed: () => boolean;
    send: (...args: unknown[]) => void;
};
type MessagePart = ChatSendMessageArgs["messages"][number]["parts"];
type StreamTextOnFinishEvent = {
    text?: string;
    reasoningText?: string;
};
type StreamTextOnErrorEvent = {
    error: unknown;
    lastError?: unknown;
};
type StreamTextOnAbortEvent = {
    steps: unknown[];
};

interface StreamTextMockOptions {
    abortSignal: AbortSignal;
    onFinish?: (event: StreamTextOnFinishEvent) => void | Promise<void>;
    onError?: (event: StreamTextOnErrorEvent) => void | Promise<void>;
    onAbort?: (event: StreamTextOnAbortEvent) => void | Promise<void>;
}

function createUserMessage(
    parts: MessagePart
): ChatSendMessageArgs["messages"][number] {
    return {
        id: "m1",
        role: "user",
        parts,
    };
}

function createIpcEvent(webContents: WebContentsMock): SendMessageEvent {
    return {sender: webContents} as unknown as SendMessageEvent;
}

function createAsyncIterable<T>(items: T[]): AsyncIterable<T> {
    return {
        async *[Symbol.asyncIterator]() {
            for (const item of items) {
                yield item;
            }
        },
    };
}

function createControllerDependencies(overrides: {
    getById?: PersonaService["getById"];
    getByName?: PersonaService["getByName"];
    getAllTools?: McpClientManager["getAllTools"];
    getEnabledExaConfig?: WebSearchConfigService["getEnabledExaConfig"];
} = {}) {
    const registry = {languageModel: vi.fn(() => "lm")};
    const modelProviderService = {
        getModelProviderRegistry: vi.fn().mockResolvedValue(registry),
    } as unknown as ModelProviderService;
    const messageService = {
        createMessage: vi.fn().mockResolvedValue(undefined),
    } as unknown as MessageService;
    const personaService = {
        getById: overrides.getById ?? vi.fn().mockResolvedValue(undefined),
        getByName: overrides.getByName ?? vi.fn().mockResolvedValue(undefined),
    } as unknown as PersonaService;
    const mcpClientManager = {
        getAllTools: overrides.getAllTools ?? vi.fn().mockResolvedValue({}),
    } as unknown as McpClientManager;
    const webSearchConfigService = {
        getEnabledExaConfig: overrides.getEnabledExaConfig ?? vi.fn().mockResolvedValue(null),
    } as unknown as WebSearchConfigService;
    const acpAgentRuntimeService = {
        createProvider: vi.fn(),
    } as unknown as AcpAgentRuntimeService;

    const chatStreamingService = new ChatStreamingService(
        modelProviderService,
        messageService,
        personaService,
        mcpClientManager,
        webSearchConfigService,
        acpAgentRuntimeService
    );
    const controller = new StreamingChatController(chatStreamingService);

    return {
        controller,
        registry,
        modelProviderService,
        messageService,
        personaService,
        mcpClientManager,
        webSearchConfigService,
    };
}

describe("StreamingChatController", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        setCoreLogger(logger);
        ai.convertToModelMessages.mockResolvedValue([]);
        ai.smoothStream.mockReturnValue("transform");
        ai.RetryError.isInstance.mockReturnValue(false);
    });

    it("aborts an active stream and logs the action", () => {
        const {controller} = createControllerDependencies();
        const abortController = new AbortController();
        const abortSpy = vi.spyOn(abortController, "abort");
        (controller as unknown as {activeStreams: Map<string, AbortController>})
            .activeStreams
            .set("chan", abortController);

        controller.abortMessage({streamChannel: "chan"} satisfies ChatAbortArgs);

        expect(abortSpy).toHaveBeenCalledTimes(1);
        expect(
            (controller as unknown as {activeStreams: Map<string, AbortController>})
                .activeStreams
                .has("chan")
        ).toBe(false);
        expect(logger.info).toHaveBeenCalledWith("Aborted stream for channel: chan");
    });

    it("streams chunks, persists messages, and emits end event on finish", async () => {
        const {
            controller,
            registry,
            messageService,
            personaService,
            mcpClientManager,
        } = createControllerDependencies({
            getById: vi.fn().mockResolvedValue({details: "persona-details"}),
        });

        ai.convertToModelMessages.mockResolvedValue([{role: "user", content: "hi"}]);
        ai.streamText.mockImplementation((options: StreamTextMockOptions) => ({
            toUIMessageStream: async function* () {
                yield {chunk: 1};
                yield {chunk: 2};
                await options.onFinish?.({text: "assistant", reasoningText: "reasoning"});
            },
        }));

        const webContents = {
            isDestroyed: vi.fn(() => false),
            send: vi.fn(),
        };
        const event = createIpcEvent(webContents);

        await controller.sendMessage(
            {
                chatId: "chat-id",
                streamChannel: "chan",
                modelIdentifier: "provider:model" as never,
                personaId: "persona-id",
                messages: [
                    createUserMessage([
                        {type: "text", text: "Hello"},
                        {type: "reasoning", text: "Think"},
                    ]),
                ],
            },
            event
        );

        expect(ai.smoothStream).toHaveBeenCalledWith({delayInMs: 30});
        expect(registry.languageModel).toHaveBeenCalledWith("provider:model");
        expect(personaService.getById).toHaveBeenCalledWith("persona-id");
        expect(mcpClientManager.getAllTools).toHaveBeenCalledTimes(1);
        expect(ai.stepCountIs).not.toHaveBeenCalled();
        expect(exa.createExaWebSearchTool).not.toHaveBeenCalled();

        const streamOptions = ai.streamText.mock.calls[0][0];
        expect(streamOptions.experimental_transform).toBe("transform");
        expect(streamOptions.messages[0]).toEqual({role: "system", content: "persona-details"});
        expect(streamOptions.stopWhen).toBeUndefined();

        expect(messageService.createMessage).toHaveBeenCalledWith({
            chatId: "chat-id",
            role: "user",
            text: "Hello",
            reasoning: "Think",
            modelIdentifier: "provider:model",
        });
        expect(messageService.createMessage).toHaveBeenCalledWith({
            chatId: "chat-id",
            role: "assistant",
            text: "assistant",
            reasoning: "reasoning",
            modelIdentifier: "provider:model",
        });

        expect(webContents.send).toHaveBeenCalledWith("chan-data", {chunk: 1});
        expect(webContents.send).toHaveBeenCalledWith("chan-data", {chunk: 2});
        expect(webContents.send).toHaveBeenCalledWith("chan-end");

        expect(
            (controller as unknown as {activeStreams: Map<string, AbortController>})
                .activeStreams
                .has("chan")
        ).toBe(false);
    });

    it("uses personaName lookup when personaId is not provided", async () => {
        const {controller, personaService} = createControllerDependencies({
            getByName: vi.fn().mockResolvedValue({details: "persona-by-name"}),
        });

        ai.convertToModelMessages.mockResolvedValue([{role: "user", content: "hi"}]);
        ai.streamText.mockImplementation((options: StreamTextMockOptions) => {
            void options.onFinish?.({text: "", reasoningText: ""});
            return {
                toUIMessageStream: () => createAsyncIterable<unknown>([]),
            };
        });

        const webContents = {
            isDestroyed: vi.fn(() => false),
            send: vi.fn(),
        };
        const event = createIpcEvent(webContents);

        await controller.sendMessage(
            {
                chatId: "chat-id",
                streamChannel: "chan",
                modelIdentifier: "provider:model" as never,
                personaName: "Persona",
                messages: [createUserMessage([{type: "text", text: "Hello"}])],
            },
            event
        );

        expect(personaService.getByName).toHaveBeenCalledWith("Persona");
        const streamOptions = ai.streamText.mock.calls[0][0];
        expect(streamOptions.messages[0]).toEqual({role: "system", content: "persona-by-name"});
        expect(
            (controller as unknown as {activeStreams: Map<string, AbortController>})
                .activeStreams
                .has("chan")
        ).toBe(false);
    });

    it("sends an error event when streamText throws", async () => {
        const {controller} = createControllerDependencies();

        ai.convertToModelMessages.mockResolvedValue([]);
        ai.streamText.mockImplementation(() => {
            throw new Error("boom");
        });

        const webContents = {
            isDestroyed: vi.fn(() => false),
            send: vi.fn(),
        };
        const event = createIpcEvent(webContents);

        await controller.sendMessage(
            {
                chatId: "chat-id",
                streamChannel: "chan",
                modelIdentifier: "provider:model" as never,
                messages: [createUserMessage([{type: "text", text: "Hello"}])],
            },
            event
        );

        expect(logger.error).toHaveBeenCalledWith("Failed to start streamText:", expect.any(Error));
        expect(webContents.send).toHaveBeenCalledWith("chan-error", expect.any(Error));
        expect(
            (controller as unknown as {activeStreams: Map<string, AbortController>})
                .activeStreams
                .has("chan")
        ).toBe(false);
    });

    it("adds the Exa web-search tool and stopWhen when Exa is enabled", async () => {
        const {controller} = createControllerDependencies({
            getEnabledExaConfig: vi.fn().mockResolvedValue({
                apiKey: "exa-secret",
                enabled: true,
            }),
        });

        ai.streamText.mockImplementation(() => ({
            toUIMessageStream: () => createAsyncIterable<unknown>([]),
        }));

        const webContents = {
            isDestroyed: vi.fn(() => false),
            send: vi.fn(),
        };
        const event = createIpcEvent(webContents);

        await controller.sendMessage(
            {
                chatId: "chat-id",
                streamChannel: "chan",
                modelIdentifier: "provider:model" as never,
                messages: [createUserMessage([{type: "text", text: "Hello"}])],
            },
            event
        );

        const streamOptions = ai.streamText.mock.calls[0][0];
        expect(exa.createExaWebSearchTool).toHaveBeenCalledWith({apiKey: "exa-secret"});
        expect(streamOptions.tools).toEqual({webSearch: "exa-tool"});
        expect(ai.stepCountIs).toHaveBeenCalledWith(5);
        expect(streamOptions.stopWhen).toBe("step:5");
    });

    it("enables multi-step execution when MCP tools are present", async () => {
        const {controller} = createControllerDependencies({
            getAllTools: vi.fn().mockResolvedValue({lookup: "tool"}),
        });

        ai.streamText.mockImplementation(() => ({
            toUIMessageStream: () => createAsyncIterable<unknown>([]),
        }));

        const webContents = {
            isDestroyed: vi.fn(() => false),
            send: vi.fn(),
        };
        const event = createIpcEvent(webContents);

        await controller.sendMessage(
            {
                chatId: "chat-id",
                streamChannel: "chan",
                modelIdentifier: "provider:model" as never,
                messages: [createUserMessage([{type: "text", text: "Hello"}])],
            },
            event
        );

        const streamOptions = ai.streamText.mock.calls[0][0];
        expect(streamOptions.tools).toEqual({lookup: "tool"});
        expect(ai.stepCountIs).toHaveBeenCalledWith(5);
        expect(streamOptions.stopWhen).toBe("step:5");
    });

    it("logs streamText onError messages and prefers RetryError.lastError", async () => {
        const {controller} = createControllerDependencies();

        ai.convertToModelMessages.mockResolvedValue([]);

        let capturedOptions: StreamTextMockOptions | undefined;
        ai.streamText.mockImplementation((options: StreamTextMockOptions) => {
            capturedOptions = options;
            return {
                toUIMessageStream: () => createAsyncIterable<unknown>([]),
            };
        });

        const webContents = {
            isDestroyed: vi.fn(() => false),
            send: vi.fn(),
        };
        const event = createIpcEvent(webContents);

        await controller.sendMessage(
            {
                chatId: "chat-id",
                streamChannel: "chan",
                modelIdentifier: "provider:model" as never,
                messages: [createUserMessage([{type: "text", text: "Hello"}])],
            },
            event
        );

        ai.RetryError.isInstance.mockReturnValue(true);
        await expect(async () => {
            await capturedOptions?.onError?.({error: "original", lastError: "retry-last"});
        }).rejects.toBe("retry-last");

        expect(logger.error).toHaveBeenCalledWith("Stream error:", expect.anything());
        expect(
            (controller as unknown as {activeStreams: Map<string, AbortController>})
                .activeStreams
                .has("chan")
        ).toBe(false);
    });

    it("exposes renderer-side no-op listener helpers", () => {
        const {controller} = createControllerDependencies();

        const cleanupData = controller.onData("x", () => {
        });
        const cleanupEnd = controller.onEnd("x", () => {
        });
        const cleanupError = controller.onError("x", () => {
        });

        expect(cleanupData).toEqual(expect.any(Function));
        expect(cleanupEnd).toEqual(expect.any(Function));
        expect(cleanupError).toEqual(expect.any(Function));

        expect(cleanupData()).toBeUndefined();
        expect(cleanupEnd()).toBeUndefined();
        expect(cleanupError()).toBeUndefined();
    });

    it("aborts and stops streaming when the WebContents is destroyed", async () => {
        const {controller} = createControllerDependencies();

        ai.convertToModelMessages.mockResolvedValue([]);
        ai.streamText.mockImplementation((options: StreamTextMockOptions) => {
            options.abortSignal.addEventListener("abort", () => {
                void options.onAbort?.({steps: []});
            });
            return {
                toUIMessageStream: () => createAsyncIterable([{chunk: 1}]),
            };
        });

        const webContents = {
            isDestroyed: vi.fn(() => true),
            send: vi.fn(),
        };
        const event = createIpcEvent(webContents);

        await controller.sendMessage(
            {
                chatId: "chat-id",
                streamChannel: "chan",
                modelIdentifier: "provider:model" as never,
                messages: [createUserMessage([{type: "text", text: "Hello"}])],
            },
            event
        );

        expect(logger.info).toHaveBeenCalledWith("WebContents destroyed, stopping stream.");
        expect(webContents.send).not.toHaveBeenCalledWith("chan-data", expect.anything());
        expect(
            (controller as unknown as {activeStreams: Map<string, AbortController>})
                .activeStreams
                .has("chan")
        ).toBe(false);
    });
});
