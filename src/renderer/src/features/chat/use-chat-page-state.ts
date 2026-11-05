'use client';

import {
    useCreateChatMutation,
    useDeleteChatMutation,
    useGetChatsQuery,
    useSelectChatMutation,
    useTogglePinnedChatMutation,
    useUpdateSelectedAgentMutation,
    useUpdateSelectedModelMutation,
    useUpdateSelectedPersonaMutation,
} from '@/features/chat/chat-api';
import { useChatSessions } from '@/features/chat/chat-session-provider';
import { useAppStore } from '@/lib/store/hooks';
import { WEB_SEARCH_NONE_OPTION_ID } from '@/lib/web-search-options';
import { Chat as ActiveChat, useChat } from '@ai-sdk/react';
import type { UIMessage } from 'ai';
import type { Chat } from 'core/dto';
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
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

    const sessions = useChatSessions();
    useSyncExternalStore(sessions.subscribe, sessions.snapshot, sessions.snapshot);
    const [session, setSession] = useState<ActiveChat<UIMessage> | null>(null);
    const fallback = useMemo(() => new ActiveChat<UIMessage>({ id: 'unselected' }), []);
    const { data: rawChatHistory = [], mutate: mutateChatHistory } = useGetChatsQuery(searchHistoryQuery);
    const chatHistory = useMemo(() => {
        const seen = new Set<string>();
        return rawChatHistory.filter((chat) => {
            if (seen.has(chat.id)) return false;
            seen.add(chat.id);
            return true;
        });
    }, [rawChatHistory]);
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
    const [createChat] = useCreateChatMutation();
    const [selectChat] = useSelectChatMutation();
    const [deleteChat] = useDeleteChatMutation();
    const [togglePinnedChat] = useTogglePinnedChatMutation();
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

    const selectedId = selectedChat?.id;
    useEffect(() => {
        let current = true;
        if (selectedId) {
            void sessions
                .acquire(selectedId)
                .then((chat) => {
                    if (current) setSession(chat);
                })
                .catch((error) => {
                    if (current) toast.error('Failed to load chat', { description: String(error) });
                });
        }
        return () => {
            current = false;
        };
    }, [selectedId, sessions]);
    const activeSession = session?.id === selectedId ? session : null;
    const { messages, sendMessage, status, addToolApprovalResponse, stop } = useChat<UIMessage>({
        chat: activeSession ?? fallback,
    });

    useEffect(() => {
        ensureChatDefaults(chatHistoryIds);
    }, [chatHistoryIds, chatHistoryIdsKey, ensureChatDefaults]);

    useEffect(() => {
        if (selectedChat?.id !== selectedChatId) {
            setSelectedChatId(selectedChat?.id ?? null);
        }
    }, [selectedChat?.id, selectedChatId, setSelectedChatId]);

    const createNewChat = useCallback(async () => {
        if (searchHistoryQuery) {
            setChatHistorySearchQuery(null);
        }
        const result = await createChat({ title: 'New Chat' });
        if ('data' in result && result.data) {
            const newChat = result.data;
            setSelectedChatId(newChat.id);
            void mutateChatHistory(
                (currentChats = []) => [
                    newChat,
                    ...currentChats.filter((c) => c.id !== newChat.id).map((c) => ({ ...c, selected: false })),
                ],
                { revalidate: false },
            );
        }
    }, [createChat, mutateChatHistory, searchHistoryQuery, setChatHistorySearchQuery, setSelectedChatId]);

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
            if (sessions.isDeleting(chat.id)) return;
            const isDeletingSelected = selectedChat?.id === chat.id;
            const currentIndex = chatHistory.findIndex((c) => c.id === chat.id);
            const remainingChats = chatHistory.filter((c) => c.id !== chat.id);
            const nextChat =
                remainingChats.length > 0
                    ? remainingChats[Math.min(Math.max(0, currentIndex), remainingChats.length - 1)]
                    : null;

            if (isDeletingSelected) {
                setSelectedChatId(nextChat?.id ?? null);
            }
            void mutateChatHistory(
                remainingChats.map((c) => ({
                    ...c,
                    selected: isDeletingSelected
                        ? nextChat
                            ? c.id === nextChat.id
                            : false
                        : c.id === selectedChat?.id,
                })),
                { revalidate: false },
            );

            await sessions.beginDeletion(chat.id);
            const result = await deleteChat(chat.id);
            sessions.endDeletion(chat.id, 'data' in result);

            if ('data' in result && isDeletingSelected && nextChat) {
                await selectChat(nextChat.id);
            }
        },
        [chatHistory, deleteChat, mutateChatHistory, selectChat, selectedChat?.id, sessions, setSelectedChatId],
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
        chatReady: !!activeSession && !sessions.isDeleting(selectedChat?.id ?? ''),
        isChatRunning: (id: string) => sessions.isRunning(id),
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
