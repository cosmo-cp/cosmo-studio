'use client';
import { JSX, useCallback, useEffect, useMemo } from 'react';
import { ChatHistory } from '@/components/chat-history';
import type { Chat } from 'core/dto';
import { ChatHeader } from '@/components/chat-header';
import { Messages } from '@/components/messages';
import { MultimodalInput } from '@/components/multimodal-input';
import { useChat } from '@ai-sdk/react';
import { createChatTransport } from '@/chat-transport';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { MessageCirclePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { lastAssistantMessageIsCompleteWithApprovalResponses, UIMessage } from 'ai';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import {
    clearConversationSearch,
    createChat,
    deleteChat,
    loadChatHistory,
    loadChatMessages,
    selectChat,
    setChatHistorySearchQuery,
    setConversationSearchQuery,
    setCurrentMatchIndex,
    setSelectedWebSearchOption,
    setTotalMatches,
    togglePinnedChat,
    updateChatInHistory as updateChatInHistoryAction,
    updateSelectedAgent,
    updateSelectedModel,
    updateSelectedPersona,
} from '@/lib/store/chat-store';
import { WEB_SEARCH_NONE_OPTION_ID } from '@/lib/web-search-options';
import { logger } from '../../../../logger';

function MainChatPage(): JSX.Element {
    const dispatch = useAppDispatch();
    const {
        chatHistory,
        selectedChat,
        searchHistoryQuery,
        searchQuery,
        currentMatchIndex,
        selectedWebSearchOptionByChatId,
        totalMatches,
    } = useAppSelector((state) => state.chat);
    const transport = useMemo(() => createChatTransport(), []);

    const syncChatInStore = useCallback((chatId: string, updates: Partial<Chat>) => {
        dispatch(updateChatInHistoryAction({ chatId, updates }));
    }, [dispatch]);

    const {
        messages,
        sendMessage,
        status,
        setMessages,
        addToolApprovalResponse,
        stop,
    } = useChat<UIMessage>({
        id: selectedChat?.id,
        transport,
        sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
        onFinish: ({ message }) => {
            // locally update the chat history
            if (!selectedChat) return;
            const textPart = message.parts?.find(p => p.type === 'text') as { type: 'text'; text: string } | undefined;
            const text = textPart?.text;
            const updates: Partial<Chat> = {
                lastMessage: text ? text.slice(0, 200) : selectedChat.lastMessage,
                lastMessageAt: new Date(),
            };
            // Update title on first exchange (matches backend logic in MessageRepository)
            const userMessages = messages.filter(m => m.role === 'user');
            if (userMessages.length === 1) {
                const userTextPart = userMessages[0].parts?.find(p => p.type === 'text') as {
                    type: 'text';
                    text: string
                } | undefined;
                if (userTextPart?.text) {
                    updates.title = userTextPart.text.slice(0, 50);
                }
            }
            syncChatInStore(selectedChat.id, updates);
        },
        onError: (error) => {
            toast.error('Failed to Stream Data', {
                description: error.message,
            });
        },
    });

    useEffect(() => {
        let active = true;
        dispatch(loadChatHistory(searchHistoryQuery))
            .unwrap()
            .then((chats) => {
                if (!active || chats.length > 0) {
                    return;
                }
                setMessages([]);
            })
            .catch((error) => {
                if (!active) {
                    return;
                }
                logger.error(error);
                toast.error('Failed to load chats', {
                    description: typeof error === 'string' ? error : undefined,
                });
            });

        return () => {
            active = false;
        };
    }, [dispatch, searchHistoryQuery, setMessages]);

    useEffect(() => {
        if (!selectedChat?.id) {
            setMessages([]);
            return;
        }

        let active = true;
        const chatId = selectedChat.id;
        dispatch(loadChatMessages(chatId))
            .unwrap()
            .then((chat) => {
                if (!active || selectedChat.id !== chatId) {
                    return;
                }
                if (chat) {
                    setMessages(chat);
                }
            })
            .catch((error) => {
                if (!active) {
                    return;
                }
                logger.error(error);
                toast.error('Failed to load chat messages', {
                    description: typeof error === 'string' ? error : undefined,
                });
            });

        return () => {
            active = false;
        };
    }, [dispatch, selectedChat?.id, setMessages]);

    const handleNewChat = useCallback(async () => {
        try {
            await dispatch(createChat({ title: 'New Chat' })).unwrap();
        } catch (error) {
            logger.error(error);
            toast.error('Failed to create chat', {
                description: typeof error === 'string' ? error : undefined,
            });
        }
    }, [dispatch]);

    const searchFromChatHistory = useCallback((searchQuery: string) => {
        dispatch(setChatHistorySearchQuery(searchQuery || null));
    }, [dispatch]);

    const handleSelectChat = useCallback(async (chat: Chat) => {
        try {
            await dispatch(selectChat(chat)).unwrap();
        } catch (error) {
            logger.error(error);
            toast.error('Failed to select chat', {
                description: typeof error === 'string' ? error : undefined,
            });
        }
    }, [dispatch]);

    const handleDeleteChat = useCallback(async (chat: Chat) => {
        try {
            await dispatch(deleteChat(chat.id)).unwrap();
        } catch (error) {
            logger.error(error);
            toast.error('Failed to delete chat', {
                description: typeof error === 'string' ? error : undefined,
            });
        }
    }, [dispatch]);

    const handlePinChat = useCallback(async (chat: Chat) => {
        try {
            await dispatch(togglePinnedChat({ chatId: chat.id, pinned: !chat.pinned })).unwrap();
        } catch (error) {
            logger.error(error);
            toast.error('Failed to update chat pin status', {
                description: typeof error === 'string' ? error : undefined,
            });
        }
    }, [dispatch]);

    const handleSearch = useCallback((query: string) => {
        if (!query) {
            dispatch(clearConversationSearch());
            return;
        }
        dispatch(setConversationSearchQuery(query));
    }, [dispatch]);

    const handleMatchesFound = useCallback((count: number) => {
        dispatch(setTotalMatches(count));
        if (count > 0) {
            if (currentMatchIndex === 0) {
                dispatch(setCurrentMatchIndex(1));
                return;
            }
            if (currentMatchIndex > count) {
                dispatch(setCurrentMatchIndex(count));
            }
        } else {
            dispatch(setCurrentMatchIndex(0));
        }
    }, [currentMatchIndex, dispatch]);

    const handleNextMatch = useCallback(() => {
        if (totalMatches > 0) {
            dispatch(setCurrentMatchIndex(currentMatchIndex < totalMatches ? currentMatchIndex + 1 : 1));
        }
    }, [currentMatchIndex, dispatch, totalMatches]);

    const handlePrevMatch = useCallback(() => {
        if (totalMatches > 0) {
            dispatch(setCurrentMatchIndex(currentMatchIndex > 1 ? currentMatchIndex - 1 : totalMatches));
        }
    }, [currentMatchIndex, dispatch, totalMatches]);

    const handleClearSearch = useCallback(() => {
        dispatch(clearConversationSearch());
    }, [dispatch]);

    const handleModelChange = useCallback((providerName: string, modelId: string) => {
        if (!selectedChat) return;

        const updates: Partial<Chat> = {
            selectedProvider: providerName,
            selectedModelId: modelId,
        };

        dispatch(updateChatInHistoryAction({ chatId: selectedChat.id, updates }));

        dispatch(updateSelectedModel({
            chatId: selectedChat.id,
            selectedProvider: providerName,
            selectedModelId: modelId,
        }))
            .unwrap()
            .catch((error) => {
                logger.error(error);
                toast.error('Failed to update chat model', {
                    description: typeof error === 'string' ? error : undefined,
                });
            });
    }, [dispatch, selectedChat]);

    const handleAgentChange = useCallback((agentId: string | null, runtime: 'model' | 'agent') => {
        if (!selectedChat) return;

        const updates: Partial<Chat> = {
            selectedAgentId: agentId,
            selectedRuntime: runtime,
        };

        dispatch(updateChatInHistoryAction({chatId: selectedChat.id, updates}));

        dispatch(updateSelectedAgent({
            chatId: selectedChat.id,
            selectedAgentId: agentId,
            selectedRuntime: runtime,
        }))
            .unwrap()
            .catch((error) => {
                logger.error(error);
                toast.error('Failed to update chat agent', {
                    description: typeof error === 'string' ? error : undefined,
                });
            });
    }, [dispatch, selectedChat]);

    const handlePersonaChange = useCallback((personaId: string | null) => {
        if (!selectedChat) return;

        const updates: Partial<Chat> = {
            selectedPersonaId: personaId,
        };

        dispatch(updateChatInHistoryAction({ chatId: selectedChat.id, updates }));

        dispatch(updateSelectedPersona({
            chatId: selectedChat.id,
            selectedPersonaId: personaId,
        }))
            .unwrap()
            .catch((error) => {
                logger.error(error);
                toast.error('Failed to update chat persona', {
                    description: typeof error === 'string' ? error : undefined,
                });
            });
    }, [dispatch, selectedChat]);

    const handleWebSearchChange = useCallback((optionId: string) => {
        if (!selectedChat) {
            return;
        }
        dispatch(setSelectedWebSearchOption({ chatId: selectedChat.id, optionId }));
    }, [dispatch, selectedChat]);

    const selectedWebSearchOptionId = selectedChat ?
        selectedWebSearchOptionByChatId[selectedChat.id] ?? WEB_SEARCH_NONE_OPTION_ID :
        WEB_SEARCH_NONE_OPTION_ID;

    return (
        <div
            className="flex-1 min-h-0 flex rounded-b-lg border-t-0 overflow-hidden bg-background">
            <ChatHistory
                chats={chatHistory}
                selectedChat={selectedChat}
                onChangeSelectedChat={handleSelectChat}
                onNewChat={handleNewChat}
                onSearch={searchFromChatHistory}
            ></ChatHistory>
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                {
                    selectedChat !== null ? (
                        <>
                            <div className="flex items-center h-16 px-4 border-b bg-background shrink-0">
                                <div className="flex-1">
                                    <ChatHeader
                                        chat={selectedChat}
                                        onDeleteChat={handleDeleteChat}
                                        onPinChat={handlePinChat}
                                        onSearch={handleSearch}
                                        currentMatch={currentMatchIndex}
                                        totalMatches={totalMatches}
                                        onNextMatch={handleNextMatch}
                                        onPrevMatch={handlePrevMatch}
                                        onClearSearch={handleClearSearch}
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
                                    onMatchesFound={handleMatchesFound}
                                    addToolApprovalResponse={addToolApprovalResponse}
                                />
                            </div>
                            <div className="p-4 bg-background shrink-0 max-w-3xl mx-auto w-full border-t">
                                <MultimodalInput
                                    chat={selectedChat}
                                    status={status}
                                    messages={messages}
                                    sendMessage={sendMessage}
                                    onModelChange={handleModelChange}
                                    onAgentChange={handleAgentChange}
                                    onPersonaChange={handlePersonaChange}
                                    onWebSearchChange={handleWebSearchChange}
                                    selectedWebSearchOptionId={selectedWebSearchOptionId}
                                    stop={stop}
                                />
                            </div>
                        </>) : (
                        <div className="h-full flex flex-col items-center justify-center">
                            <Empty>
                                <EmptyHeader>
                                    <EmptyMedia variant="icon">
                                        <MessageCirclePlus />
                                    </EmptyMedia>
                                    <EmptyTitle>Start a new Chat</EmptyTitle>
                                    <EmptyDescription>
                                        Click on the button below to Start a new Chat
                                    </EmptyDescription>
                                </EmptyHeader>
                                <EmptyContent>
                                    <Button variant="outline" size="sm" onClick={handleNewChat}>
                                        New Chat
                                    </Button>
                                </EmptyContent>
                            </Empty>
                        </div>
                    )
                }
            </div>
        </div>
    );
}

export default function Page(): JSX.Element {
    return <MainChatPage />;
}
