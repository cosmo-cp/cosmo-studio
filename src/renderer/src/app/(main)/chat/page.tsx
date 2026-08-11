'use client';

import { ChatHeader } from '@/components/chat-header';
import { ChatHistory } from '@/components/chat-history';
import { Messages } from '@/components/messages';
import { MultimodalInput } from '@/components/multimodal-input';
import { Button } from '@/components/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
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
                    <>
                        <div className="flex items-center h-16 px-4 border-b bg-background shrink-0">
                            <div className="flex-1">
                                <ChatHeader
                                    chat={selectedChat}
                                    onDeleteChat={deleteChatById}
                                    onPinChat={togglePinnedState}
                                    onSearch={searchConversation}
                                    currentMatch={currentMatchIndex}
                                    totalMatches={totalMatches}
                                    onNextMatch={goToNextMatch}
                                    onPrevMatch={goToPreviousMatch}
                                    onClearSearch={clearConversationQuery}
                                />
                            </div>
                        </div>
                        <div className="flex-1 min-h-0">
                            <Messages
                                chatId={selectedChat.id}
                                status={status}
                                messages={messages}
                                searchQuery={searchQuery}
                                currentMatchIndex={currentMatchIndex}
                                onMatchesFound={updateMatchCount}
                                addToolApprovalResponse={addToolApprovalResponse}
                            />
                        </div>
                        <div className="p-4 bg-background shrink-0 max-w-3xl mx-auto w-full border-t">
                            <MultimodalInput
                                chat={selectedChat}
                                status={status}
                                messages={messages}
                                sendMessage={sendMessage}
                                onModelChange={(providerName, modelId) =>
                                    changeSelectedModel({ providerName, modelId })
                                }
                                onAgentChange={(agentId, runtime) => changeSelectedAgent({ agentId, runtime })}
                                onPersonaChange={(personaId) => changeSelectedPersona({ personaId })}
                                onWebSearchChange={changeWebSearchOption}
                                selectedWebSearchOptionId={selectedWebSearchOptionId}
                                stop={stop}
                            />
                        </div>
                    </>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center">
                        <Empty>
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <MessageCirclePlus />
                                </EmptyMedia>
                                <EmptyTitle>Start a new Chat</EmptyTitle>
                                <EmptyDescription>Click on the button below to Start a new Chat</EmptyDescription>
                            </EmptyHeader>
                            <EmptyContent>
                                <Button variant="outline" size="sm" onClick={createNewChat}>
                                    New Chat
                                </Button>
                            </EmptyContent>
                        </Empty>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function Page(): JSX.Element {
    return <MainChatPage />;
}
