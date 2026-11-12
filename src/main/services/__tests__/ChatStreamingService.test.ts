import type { ChatSendMessageArgs } from 'core/dto';
import type { ChatService } from 'core/services/ChatService';
import type { McpClientManager } from 'core/services/McpClientManager';
import type { MessageService } from 'core/services/MessageService';
import type { ModelProviderService } from 'core/services/ModelProviderService';
import type { PersonaService } from 'core/services/PersonaService';
import type { WebSearchConfigService } from 'core/services/WebSearchConfigService';
import type { WorkspaceService } from 'core/services/WorkspaceService';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AcpAgentRuntimeService } from '../AcpAgentRuntimeService';
import { ChatStreamingService } from '../ChatStreamingService';
import { WorkspaceExecutionLockService } from '../WorkspaceExecutionLockService';

const ai = vi.hoisted(() => {
    return {
        convertToModelMessages: vi.fn().mockResolvedValue([]),
        smoothStream: vi.fn(),
        stepCountIs: vi.fn(),
        streamText: vi.fn(),
        toUIMessageStream: vi.fn(({ stream }: { stream: unknown }) => {
            return stream;
        }),
        RetryError: { isInstance: vi.fn().mockReturnValue(false) },
    };
});

vi.mock('ai', () => {
    return {
        convertToModelMessages: ai.convertToModelMessages,
        smoothStream: ai.smoothStream,
        stepCountIs: ai.stepCountIs,
        streamText: ai.streamText,
        toUIMessageStream: ai.toUIMessageStream,
        RetryError: ai.RetryError,
    };
});

vi.mock('core/platform/CoreLogger', () => {
    return {
        getCoreLogger: () => {
            return {
                info: vi.fn(),
                warn: vi.fn(),
                error: vi.fn(),
            };
        },
    };
});

describe('ChatStreamingService workspace coordination', () => {
    let service: ChatStreamingService;
    let mockModelProviderService: Record<string, unknown>;
    let mockMessageService: Record<string, unknown>;
    let mockPersonaService: Record<string, unknown>;
    let mockMcpClientManager: Record<string, unknown>;
    let mockWebSearchConfigService: Record<string, unknown>;
    let mockAcpAgentRuntimeService: Record<string, unknown>;
    let mockChatService: Record<string, unknown>;
    let workspaceLockService: WorkspaceExecutionLockService;
    let mockWorkspaceService: Record<string, unknown>;

    beforeEach(() => {
        vi.clearAllMocks();

        mockModelProviderService = {
            getModelProviderRegistry: vi.fn(),
        };
        mockMessageService = {
            createMessage: vi.fn().mockResolvedValue(undefined),
        };
        mockPersonaService = {
            getById: vi.fn().mockResolvedValue(undefined),
            getByName: vi.fn().mockResolvedValue(undefined),
        };
        mockMcpClientManager = {
            getAllTools: vi.fn().mockResolvedValue({}),
        };
        mockWebSearchConfigService = {
            getEnabledExaConfig: vi.fn().mockResolvedValue(null),
        };
        mockAcpAgentRuntimeService = {
            createProvider: vi.fn().mockResolvedValue({
                languageModel: vi.fn().mockReturnValue('mock-acp-model'),
                tools: {},
                cleanup: vi.fn(),
            }),
        };
        mockChatService = {
            getChatById: vi.fn().mockResolvedValue({ id: 'chat-1', workspaceId: null }),
            updateSelectedWorkspaceForChat: vi.fn().mockResolvedValue(undefined),
        };
        workspaceLockService = new WorkspaceExecutionLockService();
        mockWorkspaceService = {
            get: vi.fn().mockResolvedValue({
                id: 'ws-1',
                canonicalPath: '/canonical/workspace/dir',
            }),
            validateReachability: vi.fn().mockResolvedValue({
                reachable: true,
                canonicalPath: '/canonical/workspace/dir',
            }),
        };

        service = new ChatStreamingService(
            mockModelProviderService as unknown as ModelProviderService,
            mockMessageService as unknown as MessageService,
            mockPersonaService as unknown as PersonaService,
            mockMcpClientManager as unknown as McpClientManager,
            mockWebSearchConfigService as unknown as WebSearchConfigService,
            mockAcpAgentRuntimeService as unknown as AcpAgentRuntimeService,
            mockChatService as unknown as ChatService,
            workspaceLockService,
            mockWorkspaceService as unknown as WorkspaceService,
        );
    });

    it('persists workspaceId to chat on first agent turn and acquires lock', async () => {
        ai.streamText.mockImplementation((opts: { onFinish?: (res: { text: string }) => void }) => {
            expect(workspaceLockService.isWorkspaceBusy('/canonical/workspace/dir')).toBe(true);
            opts.onFinish?.({ text: 'Hello' });
            return { stream: 'mock-stream' };
        });

        const args: ChatSendMessageArgs = {
            chatId: 'chat-1',
            messages: [{ id: '1', role: 'user', parts: [{ type: 'text', text: 'hi' }] }],
            streamChannel: 'stream-1',
            runtime: 'agent',
            agentId: 'agent-1',
            workspaceId: 'ws-1',
        };

        const abortController = new AbortController();
        await service.createMessageStream(args, abortController.signal);

        expect(mockChatService.updateSelectedWorkspaceForChat).toHaveBeenCalledWith('chat-1', 'ws-1');
        expect(mockWorkspaceService.get).toHaveBeenCalledWith('ws-1');
        expect(mockWorkspaceService.validateReachability).toHaveBeenCalledWith('/canonical/workspace/dir');
        expect(mockAcpAgentRuntimeService.createProvider).toHaveBeenCalledWith(
            'agent-1',
            '/canonical/workspace/dir',
            'chat-1',
        );
        // Lock should be released on finish
        expect(workspaceLockService.isWorkspaceBusy('/canonical/workspace/dir')).toBe(false);
    });

    it('updates workspaceId on subsequent turn when workspaceId changes', async () => {
        mockChatService.getChatById = vi.fn().mockResolvedValue({ id: 'chat-1', workspaceId: 'ws-old' });
        ai.streamText.mockImplementation((opts: { onFinish?: (res: { text: string }) => void }) => {
            opts.onFinish?.({ text: 'Hello' });
            return { stream: 'mock-stream' };
        });

        const args: ChatSendMessageArgs = {
            chatId: 'chat-1',
            messages: [{ id: '1', role: 'user', parts: [{ type: 'text', text: 'hi' }] }],
            streamChannel: 'stream-1',
            runtime: 'agent',
            agentId: 'agent-1',
            workspaceId: 'ws-new',
        };

        const abortController = new AbortController();
        await service.createMessageStream(args, abortController.signal);

        expect(mockChatService.updateSelectedWorkspaceForChat).toHaveBeenCalledWith('chat-1', 'ws-new');
        expect(mockWorkspaceService.get).toHaveBeenCalledWith('ws-new');
    });

    it('rejects agent execution when workspace is busy', async () => {
        workspaceLockService.acquireLease('/canonical/workspace/dir', 'task', 'task-99');

        const args: ChatSendMessageArgs = {
            chatId: 'chat-1',
            messages: [{ id: '1', role: 'user', parts: [{ type: 'text', text: 'hi' }] }],
            streamChannel: 'stream-1',
            runtime: 'agent',
            agentId: 'agent-1',
            workspaceId: 'ws-1',
        };

        const abortController = new AbortController();
        await expect(service.createMessageStream(args, abortController.signal)).rejects.toThrow(
            'currently in use by task',
        );
    });

    it('throws error when workspace is not reachable on disk', async () => {
        mockWorkspaceService.validateReachability.mockResolvedValue({
            reachable: false,
            error: 'Workspace directory does not exist on disk',
        });

        const args: ChatSendMessageArgs = {
            chatId: 'chat-1',
            messages: [{ id: '1', role: 'user', parts: [{ type: 'text', text: 'hi' }] }],
            streamChannel: 'stream-1',
            runtime: 'agent',
            agentId: 'agent-1',
            workspaceId: 'ws-1',
        };

        const abortController = new AbortController();
        await expect(service.createMessageStream(args, abortController.signal)).rejects.toThrow(
            'Workspace directory does not exist on disk',
        );
    });

    it('releases lock when stream errors', async () => {
        ai.streamText.mockImplementation((opts: { onError?: (err: Error) => void }) => {
            expect(workspaceLockService.isWorkspaceBusy('/canonical/workspace/dir')).toBe(true);
            try {
                opts.onError?.(new Error('AI stream crashed'));
            } catch {
                // expected
            }
            return { stream: 'mock-stream' };
        });

        const args: ChatSendMessageArgs = {
            chatId: 'chat-1',
            messages: [{ id: '1', role: 'user', parts: [{ type: 'text', text: 'hi' }] }],
            streamChannel: 'stream-1',
            runtime: 'agent',
            agentId: 'agent-1',
            workspaceId: 'ws-1',
        };

        const abortController = new AbortController();
        await service.createMessageStream(args, abortController.signal);

        expect(workspaceLockService.isWorkspaceBusy('/canonical/workspace/dir')).toBe(false);
    });
});
