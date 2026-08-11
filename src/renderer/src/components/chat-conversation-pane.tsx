'use client';

import { ChatHeader } from '@/components/chat-header';
import { Messages } from '@/components/messages';
import { MultimodalInput } from '@/components/multimodal-input';
import type { ComponentProps, JSX } from 'react';

type ChatHeaderProps = ComponentProps<typeof ChatHeader>;
type MessagesProps = ComponentProps<typeof Messages>;
type MultimodalInputProps = ComponentProps<typeof MultimodalInput>;

interface ChatConversationPaneProps {
    chat: ChatHeaderProps['chat'];
    status: MessagesProps['status'];
    messages: MessagesProps['messages'];
    searchQuery: MessagesProps['searchQuery'];
    currentMatchIndex: NonNullable<MessagesProps['currentMatchIndex']>;
    totalMatches: ChatHeaderProps['totalMatches'];
    selectedWebSearchOptionId: MultimodalInputProps['selectedWebSearchOptionId'];
    addToolApprovalResponse: MessagesProps['addToolApprovalResponse'];
    sendMessage: MultimodalInputProps['sendMessage'];
    stop: MultimodalInputProps['stop'];
    onDeleteChat: ChatHeaderProps['onDeleteChat'];
    onPinChat: ChatHeaderProps['onPinChat'];
    onSearch: ChatHeaderProps['onSearch'];
    onNextMatch: ChatHeaderProps['onNextMatch'];
    onPrevMatch: ChatHeaderProps['onPrevMatch'];
    onClearSearch: ChatHeaderProps['onClearSearch'];
    onMatchesFound: MessagesProps['onMatchesFound'];
    onModelChange: MultimodalInputProps['onModelChange'];
    onAgentChange: MultimodalInputProps['onAgentChange'];
    onPersonaChange: MultimodalInputProps['onPersonaChange'];
    onWebSearchChange: MultimodalInputProps['onWebSearchChange'];
}

// Keep the selected-chat column reusable so pages only orchestrate chat state.
export function ChatConversationPane({
    chat,
    status,
    messages,
    searchQuery,
    currentMatchIndex,
    totalMatches,
    selectedWebSearchOptionId,
    addToolApprovalResponse,
    sendMessage,
    stop,
    onDeleteChat,
    onPinChat,
    onSearch,
    onNextMatch,
    onPrevMatch,
    onClearSearch,
    onMatchesFound,
    onModelChange,
    onAgentChange,
    onPersonaChange,
    onWebSearchChange,
}: ChatConversationPaneProps): JSX.Element {
    return (
        <>
            <div className="flex items-center h-16 px-4 border-b bg-background shrink-0">
                <div className="flex-1">
                    <ChatHeader
                        chat={chat}
                        onDeleteChat={onDeleteChat}
                        onPinChat={onPinChat}
                        onSearch={onSearch}
                        currentMatch={currentMatchIndex}
                        totalMatches={totalMatches}
                        onNextMatch={onNextMatch}
                        onPrevMatch={onPrevMatch}
                        onClearSearch={onClearSearch}
                    />
                </div>
            </div>
            <div className="flex-1 min-h-0">
                <Messages
                    chatId={chat.id}
                    status={status}
                    messages={messages}
                    searchQuery={searchQuery}
                    currentMatchIndex={currentMatchIndex}
                    onMatchesFound={onMatchesFound}
                    addToolApprovalResponse={addToolApprovalResponse}
                />
            </div>
            <div className="p-4 bg-background shrink-0 max-w-3xl mx-auto w-full border-t">
                <MultimodalInput
                    chat={chat}
                    status={status}
                    messages={messages}
                    sendMessage={sendMessage}
                    onModelChange={onModelChange}
                    onAgentChange={onAgentChange}
                    onPersonaChange={onPersonaChange}
                    onWebSearchChange={onWebSearchChange}
                    selectedWebSearchOptionId={selectedWebSearchOptionId}
                    stop={stop}
                />
            </div>
        </>
    );
}
