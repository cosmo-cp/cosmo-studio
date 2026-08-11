'use client';

import { ChatConversationPane } from '@/components/chat-conversation-pane';
import { ChatHistory } from '@/components/chat-history';
import { PageEmptyState } from '@/components/page-empty-state';
import { Button } from '@/components/ui/button';
import { useChatPageState } from '@/features/chat/use-chat-page-state';
import { MessageCirclePlus } from 'lucide-react';
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
            <ChatHistory
                chats={chatHistory}
                selectedChat={selectedChat}
                onChangeSelectedChat={selectChatById}
                onNewChat={createNewChat}
                onSearch={searchChatHistory}
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
