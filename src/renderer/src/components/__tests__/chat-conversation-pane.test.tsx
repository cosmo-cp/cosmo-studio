import { render, screen } from '@testing-library/react';
import type { UIMessage } from 'ai';
import type { Chat } from 'core/dto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatConversationPane } from '../chat-conversation-pane';

type ChatHeaderProps = Record<string, unknown>;
type MessagesProps = Record<string, unknown>;
type MultimodalInputProps = Record<string, unknown>;

const capturedProps = vi.hoisted(() => ({
    chatHeader: null as ChatHeaderProps | null,
    messages: null as MessagesProps | null,
    multimodalInput: null as MultimodalInputProps | null,
}));

vi.mock('@/components/chat-header', () => ({
    ChatHeader: (props: ChatHeaderProps) => {
        capturedProps.chatHeader = props;
        return <div data-testid="chat-header" />;
    },
}));

vi.mock('@/components/messages', () => ({
    Messages: (props: MessagesProps) => {
        capturedProps.messages = props;
        return <div data-testid="messages" />;
    },
}));

vi.mock('@/components/multimodal-input', () => ({
    MultimodalInput: (props: MultimodalInputProps) => {
        capturedProps.multimodalInput = props;
        return <div data-testid="multimodal-input" />;
    },
}));

function buildChat(overrides: Partial<Chat> = {}): Chat {
    return {
        id: 'chat-1',
        createdAt: new Date('2026-03-18T00:00:00.000Z'),
        title: 'Chat 1',
        pinned: false,
        pinnedAt: null,
        selectedProvider: 'openai',
        selectedModelId: 'gpt-4.1',
        selectedPersonaId: null,
        selectedAgentId: null,
        selectedRuntime: 'model',
        selected: true,
        lastMessage: null,
        lastMessageAt: null,
        ...overrides,
    };
}

describe('ChatConversationPane', () => {
    beforeEach(() => {
        capturedProps.chatHeader = null;
        capturedProps.messages = null;
        capturedProps.multimodalInput = null;
    });

    it('renders the selected chat detail stack and forwards state to each child component', () => {
        const chat = buildChat();
        const messages = [] as UIMessage[];
        const sendMessage = vi.fn();
        const stop = vi.fn();
        const addToolApprovalResponse = vi.fn();
        const onDeleteChat = vi.fn();
        const onPinChat = vi.fn();
        const onSearch = vi.fn();
        const onNextMatch = vi.fn();
        const onPrevMatch = vi.fn();
        const onClearSearch = vi.fn();
        const onMatchesFound = vi.fn();
        const onModelChange = vi.fn();
        const onAgentChange = vi.fn();
        const onPersonaChange = vi.fn();
        const onWebSearchChange = vi.fn();
        const hideAgentControls = true;

        render(
            <ChatConversationPane
                chat={chat}
                status="ready"
                messages={messages}
                searchQuery="agent"
                currentMatchIndex={2}
                totalMatches={4}
                selectedWebSearchOptionId="search-option-1"
                addToolApprovalResponse={addToolApprovalResponse}
                sendMessage={sendMessage}
                stop={stop}
                onDeleteChat={onDeleteChat}
                onPinChat={onPinChat}
                onSearch={onSearch}
                onNextMatch={onNextMatch}
                onPrevMatch={onPrevMatch}
                onClearSearch={onClearSearch}
                onMatchesFound={onMatchesFound}
                onModelChange={onModelChange}
                onAgentChange={onAgentChange}
                onPersonaChange={onPersonaChange}
                onWebSearchChange={onWebSearchChange}
                hideAgentControls={hideAgentControls}
            />,
        );

        expect(screen.getByTestId('chat-header')).toBeInTheDocument();
        expect(screen.getByTestId('messages')).toBeInTheDocument();
        expect(screen.getByTestId('multimodal-input')).toBeInTheDocument();

        expect(capturedProps.chatHeader).toMatchObject({
            chat,
            currentMatch: 2,
            totalMatches: 4,
            onDeleteChat,
            onPinChat,
            onSearch,
            onNextMatch,
            onPrevMatch,
            onClearSearch,
        });
        expect(capturedProps.messages).toMatchObject({
            chatId: 'chat-1',
            status: 'ready',
            messages,
            searchQuery: 'agent',
            currentMatchIndex: 2,
            onMatchesFound,
            addToolApprovalResponse,
        });
        expect(capturedProps.multimodalInput).toMatchObject({
            chat,
            status: 'ready',
            messages,
            sendMessage,
            onModelChange,
            onAgentChange,
            onPersonaChange,
            onWebSearchChange,
            hideAgentControls,
            selectedWebSearchOptionId: 'search-option-1',
            stop,
        });
    });
});
