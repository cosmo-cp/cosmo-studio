'use client';

import { createChatTransport } from '@/chat-transport';
import {
    useCreateChatMutation,
    useDeleteChatMutation,
    useGetChatMessagesQuery,
    useGetChatsQuery,
    useSelectChatMutation,
    useTogglePinnedChatMutation,
    useUpdateChatMutation,
    useUpdateSelectedAgentMutation,
    useUpdateSelectedModelMutation,
    useUpdateSelectedPersonaMutation,
} from '@/features/chat/chat-api';
import { useAppStore } from '@/lib/store/hooks';
import { WEB_SEARCH_NONE_OPTION_ID } from '@/lib/web-search-options';
import { useChat } from '@ai-sdk/react';
import { lastAssistantMessageIsCompleteWithApprovalResponses, UIMessage } from 'ai';
import type { Chat } from 'core/dto';
import { useCallback, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { useShallow } from 'zustand/react/shallow';

interface ModelChangePayload {
    providerName: string;
    modelId: string;
}

interface AgentChangePayload {
    agentId: string | null;
    runtime: 'model' | 'agent';
}

interface PersonaChangePayload {
    personaId: string | null;
}

// Keep the chat page API small so the page component stays presentational.
export function useChatPageState() {
    const {
        selectedChatId,
        searchHistoryQuery,
        searchQuery,
        currentMatchIndex,
        selectedWebSearchOptionByChatId,
        totalMatches,
        clearConversationSearch,
        ensureChatDefaults,
        setChatHistorySearchQuery,
        setConversationSearchQuery,
        setCurrentMatchIndex,
        setSelectedChatId,
        setSelectedWebSearchOption,
        setTotalMatches,
    } = useAppStore(
        useShallow((state) => ({
            selectedChatId: state.selectedChatId,
            searchHistoryQuery: state.searchHistoryQuery,
            searchQuery: state.searchQuery,
            currentMatchIndex: state.currentMatchIndex,
            selectedWebSearchOptionByChatId: state.selectedWebSearchOptionByChatId,
            totalMatches: state.totalMatches,
            clearConversationSearch: state.clearConversationSearch,
            ensureChatDefaults: state.ensureChatDefaults,
            setChatHistorySearchQuery: state.setChatHistorySearchQuery,
            setConversationSearchQuery: state.setConversationSearchQuery,
            setCurrentMatchIndex: state.setCurrentMatchIndex,
            setSelectedChatId: state.setSelectedChatId,
            setSelectedWebSearchOption: state.setSelectedWebSearchOption,
            setTotalMatches: state.setTotalMatches,
        })),
    );

    const transport = useMemo(() => createChatTransport(), []);
    const { data: chatHistory = [], mutate: mutateChatHistory } = useGetChatsQuery(searchHistoryQuery);
    const chatHistoryIds = useMemo(() => chatHistory.map((chat) => chat.id), [chatHistory]);
    const chatHistoryIdsKey = useMemo(() => chatHistoryIds.join('\0'), [chatHistoryIds]);
    const selectedChat = useMemo(
        () =>
            chatHistory.find((chat) => chat.id === selectedChatId) ??
            chatHistory.find((chat) => chat.selected) ??
            chatHistory[0] ??
            null,
        [chatHistory, selectedChatId],
    );
    const { data: chatMessages } = useGetChatMessagesQuery(selectedChat?.id);
    const [createChat] = useCreateChatMutation();
    const [selectChat] = useSelectChatMutation();
    const [deleteChat] = useDeleteChatMutation();
    const [togglePinnedChat] = useTogglePinnedChatMutation();
    const [updateChat] = useUpdateChatMutation();
    const [updateSelectedModel] = useUpdateSelectedModelMutation();
    const [updateSelectedAgent] = useUpdateSelectedAgentMutation();
    const [updateSelectedPersona] = useUpdateSelectedPersonaMutation();

    const syncChatQuery = useCallback(
        (chatId: string, updates: Partial<Chat>) => {
            void mutateChatHistory(
                (currentChats = []) =>
                    currentChats.map((chat) => (chat.id === chatId ? { ...chat, ...updates } : chat)),
                { revalidate: false },
            );
        },
        [mutateChatHistory],
    );

    const markSelectedChat = useCallback(
        (chatId: string) => {
            void mutateChatHistory(
                (currentChats = []) =>
                    currentChats.map((chat) => ({
                        ...chat,
                        selected: chat.id === chatId,
                    })),
                { revalidate: false },
            );
        },
        [mutateChatHistory],
    );

    const { messages, sendMessage, status, setMessages, addToolApprovalResponse, stop } = useChat<UIMessage>({
        id: selectedChat?.id,
        transport,
        sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
        onFinish: ({ message }) => {
            if (!selectedChat) {
                return;
            }

            const textPart = message.parts?.find((part) => part.type === 'text') as
                | { type: 'text'; text: string }
                | undefined;
            const updates: Partial<Chat> = {
                lastMessage: textPart?.text ? textPart.text.slice(0, 200) : selectedChat.lastMessage,
                lastMessageAt: new Date(),
            };

            const userMessages = messages.filter((chatMessage) => chatMessage.role === 'user');
            if (userMessages.length === 1) {
                const userTextPart = userMessages[0].parts?.find((part) => part.type === 'text') as
                    | { type: 'text'; text: string }
                    | undefined;
                if (userTextPart?.text) {
                    updates.title = userTextPart.text.slice(0, 50);
                }
            }

            syncChatQuery(selectedChat.id, updates);
            void updateChat({
                chatId: selectedChat.id,
                updates: {
                    title: updates.title ?? selectedChat.title,
                    lastMessage: updates.lastMessage ?? selectedChat.lastMessage,
                },
            });
        },
        onError: (error) => {
            toast.error('Failed to stream data', {
                description: error.message,
            });
        },
    });

    useEffect(() => {
        ensureChatDefaults(chatHistoryIds);
    }, [chatHistoryIds, chatHistoryIdsKey, ensureChatDefaults]);

    useEffect(() => {
        if (selectedChat?.id !== selectedChatId) {
            setSelectedChatId(selectedChat?.id ?? null);
        }
    }, [selectedChat?.id, selectedChatId, setSelectedChatId]);

    useEffect(() => {
        if (!selectedChat) {
            setMessages([]);
            return;
        }

        setMessages(chatMessages ?? []);
    }, [chatMessages, selectedChat, setMessages]);

    const createNewChat = useCallback(async () => {
        await createChat({ title: 'New Chat' });
    }, [createChat]);

    const searchChatHistory = useCallback(
        (nextSearchQuery: string) => {
            setChatHistorySearchQuery(nextSearchQuery || null);
        },
        [setChatHistorySearchQuery],
    );

    const selectChatById = useCallback(
        async (chat: Chat) => {
            setSelectedChatId(chat.id);
            markSelectedChat(chat.id);
            await selectChat(chat.id);
        },
        [markSelectedChat, selectChat, setSelectedChatId],
    );

    const deleteChatById = useCallback(
        async (chat: Chat) => {
            if (selectedChat?.id === chat.id) {
                setSelectedChatId(null);
            }

            await deleteChat(chat.id);
        },
        [deleteChat, selectedChat?.id, setSelectedChatId],
    );

    const togglePinnedState = useCallback(
        async (chat: Chat) => {
            syncChatQuery(chat.id, { pinned: !chat.pinned });
            await togglePinnedChat({ chatId: chat.id, pinned: !chat.pinned });
        },
        [syncChatQuery, togglePinnedChat],
    );

    const searchConversation = useCallback(
        (query: string) => {
            if (!query) {
                clearConversationSearch();
                return;
            }

            setConversationSearchQuery(query);
        },
        [clearConversationSearch, setConversationSearchQuery],
    );

    const updateMatchCount = useCallback(
        (count: number) => {
            setTotalMatches(count);
            if (count > 0) {
                if (currentMatchIndex === 0) {
                    setCurrentMatchIndex(1);
                    return;
                }
                if (currentMatchIndex > count) {
                    setCurrentMatchIndex(count);
                }
            } else {
                setCurrentMatchIndex(0);
            }
        },
        [currentMatchIndex, setCurrentMatchIndex, setTotalMatches],
    );

    const goToNextMatch = useCallback(() => {
        if (totalMatches > 0) {
            setCurrentMatchIndex(currentMatchIndex < totalMatches ? currentMatchIndex + 1 : 1);
        }
    }, [currentMatchIndex, setCurrentMatchIndex, totalMatches]);

    const goToPreviousMatch = useCallback(() => {
        if (totalMatches > 0) {
            setCurrentMatchIndex(currentMatchIndex > 1 ? currentMatchIndex - 1 : totalMatches);
        }
    }, [currentMatchIndex, setCurrentMatchIndex, totalMatches]);

    const clearConversationQuery = useCallback(() => {
        clearConversationSearch();
    }, [clearConversationSearch]);

    const changeSelectedModel = useCallback(
        ({ providerName, modelId }: ModelChangePayload) => {
            if (!selectedChat) {
                return;
            }

            syncChatQuery(selectedChat.id, {
                selectedProvider: providerName,
                selectedModelId: modelId,
                selectedRuntime: 'model',
            });

            void updateSelectedModel({
                chatId: selectedChat.id,
                modelIdentifier: {
                    selectedProvider: providerName,
                    selectedModelId: modelId,
                },
            });
        },
        [selectedChat, syncChatQuery, updateSelectedModel],
    );

    const changeSelectedAgent = useCallback(
        ({ agentId, runtime }: AgentChangePayload) => {
            if (!selectedChat) {
                return;
            }

            syncChatQuery(selectedChat.id, {
                selectedAgentId: agentId,
                selectedRuntime: runtime,
            });

            void updateSelectedAgent({
                chatId: selectedChat.id,
                agentIdentifier: {
                    selectedAgentId: agentId,
                    selectedRuntime: runtime,
                },
            });
        },
        [selectedChat, syncChatQuery, updateSelectedAgent],
    );

    const changeSelectedPersona = useCallback(
        ({ personaId }: PersonaChangePayload) => {
            if (!selectedChat) {
                return;
            }

            syncChatQuery(selectedChat.id, {
                selectedPersonaId: personaId,
            });

            void updateSelectedPersona({
                chatId: selectedChat.id,
                personaIdentifier: {
                    selectedPersonaId: personaId,
                },
            });
        },
        [selectedChat, syncChatQuery, updateSelectedPersona],
    );

    const changeWebSearchOption = useCallback(
        (optionId: string) => {
            if (!selectedChat) {
                return;
            }

            setSelectedWebSearchOption({ chatId: selectedChat.id, optionId });
        },
        [selectedChat, setSelectedWebSearchOption],
    );

    const selectedWebSearchOptionId = selectedChat
        ? (selectedWebSearchOptionByChatId[selectedChat.id] ?? WEB_SEARCH_NONE_OPTION_ID)
        : WEB_SEARCH_NONE_OPTION_ID;

    return {
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
    };
}
