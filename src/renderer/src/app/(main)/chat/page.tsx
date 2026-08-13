'use client';

import { ChatConversationPane } from '@/components/chat-conversation-pane';
import { HistoryPanel } from '@/components/history-panel';
import { PageEmptyState } from '@/components/page-empty-state';
import { Button } from '@/components/ui/button';
import { useChatPageState } from '@/features/chat/use-chat-page-state';
import { formatHistoryTimestamp } from '@/lib/utils';
import { MessageCirclePlus, Pin } from 'lucide-react';
import { JSX } from 'react';

function MainChatPage(): JSX.Element {
    const {
        selectedChat,
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
    } = useChatPageState();

    return (
        <div className="flex-1 min-h-0 flex rounded-b-lg border-t-0 overflow-hidden bg-background">
            <HistoryPanel
                action={{
                    ariaLabel: 'New Chat',
                    icon: MessageCirclePlus,
                    label: 'New Chat',
                    onClick: createNewChat,
                }}
                getItemKey={(chat) => chat.id}
                items={chatHistory}
                onSearch={searchChatHistory}
                renderPreview={(chat) => ({
                    className: 'items-center',
                    footerTrailing: chat.pinned ? (
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
                searchPlaceholder="Search history..."
                title="Chat"
            />
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                {selectedChat ? (
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
                        hideAgentControls
                    />
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
