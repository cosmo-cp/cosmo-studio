'use client';

import { JSX, useCallback, useEffect } from 'react';
import { ChatHistory } from '@/components/chat-history';
import { ChatHeader } from '@/components/chat-header';
import { Messages } from '@/components/messages';
import { MultimodalInput } from '@/components/multimodal-input';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { MessageCirclePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    approveToolCall,
    chatActions,
    createChat,
    deleteChat,
    loadChatCatalog,
    loadChats,
    regenerateChatResponse,
    selectChat,
    selectChats,
    selectSelectedChat,
    selectSelectedMessages,
    selectSelectedStatus,
    sendChatMessage,
    stopChatResponse,
    togglePinnedChat,
    updateSelectedModel,
    updateSelectedPersona,
} from '@/store/chat-slice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import type { PromptInputMessage } from '@/components/ai-elements/prompt-input';

export default function Page(): JSX.Element {
    const dispatch = useAppDispatch();
    const chatHistory = useAppSelector(selectChats);
    const selectedChat = useAppSelector(selectSelectedChat);
    const messages = useAppSelector(selectSelectedMessages);
    const status = useAppSelector(selectSelectedStatus);
    const searchQuery = useAppSelector((state) => state.chat.conversationSearchQuery);
    const currentMatchIndex = useAppSelector((state) => state.chat.currentMatchIndex);
    const totalMatches = useAppSelector((state) => state.chat.totalMatches);
    const catalog = useAppSelector((state) => state.chat.catalog);
    const draft = useAppSelector((state) => (selectedChat ? state.chat.draftsByChatId[selectedChat.id] ?? '' : ''));

    useEffect(() => {
        void dispatch(loadChats());
        void dispatch(loadChatCatalog());
    }, [dispatch]);

    const handleNewChat = useCallback(() => {
        void dispatch(createChat());
    }, [dispatch]);

    const searchFromChatHistory = useCallback(
        (query: string) => {
            dispatch(chatActions.historySearchChanged(query));
            void dispatch(loadChats());
        },
        [dispatch],
    );

    const handleSelectChat = useCallback(
        (chatId: string) => {
            void dispatch(selectChat(chatId));
        },
        [dispatch],
    );

    const handleDeleteChat = useCallback(
        (chatId: string) => {
            void dispatch(deleteChat(chatId));
        },
        [dispatch],
    );

    const handlePinChat = useCallback(
        (chatId: string, pinned: boolean) => {
            void dispatch(togglePinnedChat({ chatId, pinned }));
        },
        [dispatch],
    );

    const handleSearch = useCallback(
        (query: string) => {
            dispatch(chatActions.conversationSearchChanged(query));
        },
        [dispatch],
    );

    const handleMatchesFound = useCallback(
        (count: number) => {
            dispatch(chatActions.matchesFound(count));
        },
        [dispatch],
    );

    const handleModelChange = useCallback(
        (providerName: string, modelId: string) => {
            if (!selectedChat) return;
            void dispatch(updateSelectedModel({ chatId: selectedChat.id, providerName, modelId }));
        },
        [dispatch, selectedChat],
    );

    const handlePersonaChange = useCallback(
        (personaId: string | null) => {
            if (!selectedChat) return;
            void dispatch(updateSelectedPersona({ chatId: selectedChat.id, personaId }));
        },
        [dispatch, selectedChat],
    );

    const handleDraftChange = useCallback(
        (draftText: string) => {
            if (!selectedChat) return;
            dispatch(chatActions.draftChanged({ chatId: selectedChat.id, draft: draftText }));
        },
        [dispatch, selectedChat],
    );

    const handleSendMessage = useCallback(
        (message: PromptInputMessage) => {
            if (!selectedChat) {
                return Promise.resolve();
            }
            return dispatch(
                sendChatMessage({
                    chatId: selectedChat.id,
                    text: message.text,
                    files: message.files,
                }),
            ).unwrap();
        },
        [dispatch, selectedChat],
    );

    const handleRegenerate = useCallback(
        (options?: { messageId?: string }) => {
            if (!selectedChat) {
                return Promise.resolve();
            }
            void dispatch(regenerateChatResponse({ chatId: selectedChat.id, messageId: options?.messageId }));
            return Promise.resolve();
        },
        [dispatch, selectedChat],
    );

    const handleToolApproval = useCallback(
        (response: { id: string; approved: boolean; reason?: string }) => {
            if (!selectedChat) {
                return Promise.resolve();
            }
            void dispatch(approveToolCall({ chatId: selectedChat.id, response }));
            return Promise.resolve();
        },
        [dispatch, selectedChat],
    );

    const handleStop = useCallback(() => {
        if (!selectedChat) return;
        void dispatch(stopChatResponse(selectedChat.id));
    }, [dispatch, selectedChat]);

    return (
        <div className="flex-1 min-h-0 flex rounded-b-lg border-t-0 overflow-hidden bg-background">
            <ChatHistory
                chats={chatHistory}
                selectedChat={selectedChat}
                onChangeSelectedChat={(chat) => handleSelectChat(chat.id)}
                onNewChat={handleNewChat}
                onSearch={searchFromChatHistory}
            ></ChatHistory>
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                {selectedChat !== null ? (
                    <>
                        <div className="flex items-center h-16 px-4 border-b bg-background shrink-0">
                            <div className="flex-1">
                                <ChatHeader
                                    chat={selectedChat}
                                    onDeleteChat={(chat) => handleDeleteChat(chat.id)}
                                    onPinChat={(chat) => handlePinChat(chat.id, chat.pinned ?? false)}
                                    onSearch={handleSearch}
                                    currentMatch={currentMatchIndex}
                                    totalMatches={totalMatches}
                                    onNextMatch={() => dispatch(chatActions.nextMatch())}
                                    onPrevMatch={() => dispatch(chatActions.previousMatch())}
                                    onClearSearch={() => dispatch(chatActions.clearConversationSearch())}
                                />
                            </div>
                        </div>
                        <div className="flex-1 min-h-0">
                            <Messages
                                chatId={selectedChat.id}
                                status={status}
                                messages={messages}
                                regenerate={handleRegenerate}
                                searchQuery={searchQuery}
                                currentMatchIndex={currentMatchIndex}
                                onMatchesFound={handleMatchesFound}
                                addToolApprovalResponse={handleToolApproval}
                                providers={catalog.providers}
                            />
                        </div>
                        <div className="p-4 bg-background shrink-0 max-w-3xl mx-auto w-full border-t">
                            <MultimodalInput
                                chat={selectedChat}
                                status={status}
                                messages={messages}
                                draft={draft}
                                onDraftChange={handleDraftChange}
                                onSendMessage={handleSendMessage}
                                onModelChange={handleModelChange}
                                onPersonaChange={handlePersonaChange}
                                stop={handleStop}
                                providers={catalog.providers}
                                personas={catalog.personas}
                                commands={catalog.commands}
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
                                <Button variant="outline" size="sm" onClick={handleNewChat}>
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
