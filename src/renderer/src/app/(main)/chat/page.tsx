'use client';

import { ChatConversationPane } from '@/components/chat-conversation-pane';
import { HistoryPanel } from '@/components/history-panel';
import { PageEmptyState } from '@/components/page-empty-state';
import { Button } from '@/components/ui/button';
import { useChatPageState } from '@/features/chat/use-chat-page-state';
import { formatHistoryTimestamp } from '@/lib/utils';
import { MessageCirclePlus, Pin, Plus } from 'lucide-react';
import { JSX, useCallback } from 'react';

function MainChatPage(): JSX.Element {
    const {
        selectedChat,
        chatReady,
        isChatRunning,
        chatHistory,
        messages,
        status,
        searchQuery,
        currentMatchIndex,
        totalMatches,
        selectedWebSearchOptionId,
        addToolApprovalResponse,
        sendMessage,
        stop,
        createNewChat,
        searchChatHistory,
        selectChatById,
        deleteChatById,
        togglePinnedState,
        searchConversation,
        updateMatchCount,
        goToNextMatch,
        goToPreviousMatch,
        clearConversationQuery,
        changeSelectedModel,
        changeSelectedAgent,
        changeSelectedPersona,
        changeWebSearchOption,
        selectedWorkspaceId,
        isWorkspaceLocked,
        changeSelectedWorkspace,
    } = useChatPageState();

    const getItemGroup = useCallback((chat: (typeof chatHistory)[number]) => {
        const timestamp = chat.lastMessageAt || chat.createdAt;
        if (!timestamp) return 'Earlier';
        const date = new Date(timestamp);
        const now = new Date();
        if (date.toDateString() === now.toDateString()) {
            return 'Today';
        }
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        }
        return 'Earlier';
    }, []);

    return (
        <div className="flex-1 min-h-0 flex rounded-b-lg border-t-0 overflow-hidden bg-background">
            <HistoryPanel
                action={{
                    ariaLabel: 'New Chat',
                    icon: Plus,
                    label: 'New Chat',
                    onClick: createNewChat,
                }}
                getItemGroup={getItemGroup}
                getItemKey={(chat) => chat.id}
                items={chatHistory}
                onSearch={searchChatHistory}
                renderPreview={(chat) => ({
                    className: 'items-center',
                    footerTrailing: isChatRunning(chat.id) ? (
                        <span className="text-xs text-muted-foreground" role="status">
                            Running
                        </span>
                    ) : chat.pinned ? (
                        <Pin className="h-3 w-3 shrink-0 text-muted-foreground" fill="black" />
                    ) : null,
                    headerTrailing: formatHistoryTimestamp(chat.lastMessageAt),
                    onSelect: () => selectChatById(chat),
                    selected: selectedChat?.id === chat.id,
                    summary: (
                        <p className="max-w-[140px] truncate pr-2 text-sm text-muted-foreground lg:max-w-[170px]">
                            {chat.lastMessage}
                        </p>
                    ),
                    title: <h3 className="max-w-[160px] truncate font-medium lg:max-w-[180px]">{chat.title}</h3>,
                })}
                searchAriaLabel="Search chats"
                searchPlaceholder="Search conversations..."
                title="Chat"
            />
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                {selectedChat && chatReady ? (
                    <ChatConversationPane
                        chat={selectedChat}
                        status={status}
                        messages={messages}
                        searchQuery={searchQuery}
                        currentMatchIndex={currentMatchIndex}
                        totalMatches={totalMatches}
                        selectedWebSearchOptionId={selectedWebSearchOptionId}
                        addToolApprovalResponse={addToolApprovalResponse}
                        sendMessage={sendMessage}
                        stop={stop}
                        onDeleteChat={deleteChatById}
                        onPinChat={togglePinnedState}
                        onSearch={searchConversation}
                        onNextMatch={goToNextMatch}
                        onPrevMatch={goToPreviousMatch}
                        onClearSearch={clearConversationQuery}
                        onMatchesFound={updateMatchCount}
                        onModelChange={(providerName, modelId) => changeSelectedModel({ providerName, modelId })}
                        onAgentChange={(agentId, runtime) => changeSelectedAgent({ agentId, runtime })}
                        onPersonaChange={(personaId) => changeSelectedPersona({ personaId })}
                        onWebSearchChange={changeWebSearchOption}
                        selectedWorkspaceId={selectedWorkspaceId}
                        isWorkspaceLocked={isWorkspaceLocked}
                        onWorkspaceChange={changeSelectedWorkspace}
                        hideAgentControls={false}
                        hideWebSearchControls
                    />
                ) : selectedChat ? (
                    <div className="p-4 text-sm text-muted-foreground" role="status">
                        Loading chat…
                    </div>
                ) : (
                    <PageEmptyState
                        icon={MessageCirclePlus}
                        title="Start a new Chat"
                        description="Click on the button below to Start a new Chat"
                        action={
                            <Button variant="outline" size="sm" onClick={createNewChat}>
                                New Chat
                            </Button>
                        }
                    />
                )}
            </div>
        </div>
    );
}

export default function Page(): JSX.Element {
    return <MainChatPage />;
}
