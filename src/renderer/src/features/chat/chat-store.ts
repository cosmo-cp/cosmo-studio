import type { AppStoreState } from '@/lib/store/store';
import { WEB_SEARCH_NONE_OPTION_ID } from '@/lib/web-search-options';
import type { StateCreator } from 'zustand';

export interface ChatState {
    selectedChatId: string | null;
    searchHistoryQuery: string | null;
    searchQuery: string;
    currentMatchIndex: number;
    totalMatches: number;
    selectedWebSearchOptionByChatId: Record<string, string>;
}

interface SetSelectedWebSearchOptionPayload {
    chatId: string;
    optionId: string;
}

export interface ChatSlice extends ChatState {
    setSelectedChatId: (chatId: string | null) => void;
    setChatHistorySearchQuery: (searchQuery: string | null) => void;
    setConversationSearchQuery: (searchQuery: string) => void;
    setCurrentMatchIndex: (matchIndex: number) => void;
    setTotalMatches: (matchCount: number) => void;
    clearConversationSearch: () => void;
    setSelectedWebSearchOption: (payload: SetSelectedWebSearchOptionPayload) => void;
    ensureChatDefaults: (chatIds: string[]) => void;
}

export function createInitialChatState(): ChatState {
    return {
        selectedChatId: null,
        searchHistoryQuery: null,
        searchQuery: '',
        currentMatchIndex: 0,
        totalMatches: 0,
        selectedWebSearchOptionByChatId: {},
    };
}

// Keep per-chat web-search defaults aligned with the visible history list.
export function applyChatDefaults(selections: Record<string, string>, chatIds: string[]): Record<string, string> {
    const nextSelections = Object.fromEntries(
        chatIds.map((chatId) => [chatId, selections[chatId] ?? WEB_SEARCH_NONE_OPTION_ID]),
    );
    const currentEntries = Object.entries(selections);
    const nextEntries = Object.entries(nextSelections);
    const hasSameSize = currentEntries.length === nextEntries.length;
    const hasSameSelections = hasSameSize && nextEntries.every(([chatId, optionId]) => selections[chatId] === optionId);

    return hasSameSelections ? selections : nextSelections;
}

export const createChatSlice: StateCreator<AppStoreState, [], [], ChatSlice> = (set) => ({
    ...createInitialChatState(),
    setSelectedChatId: (selectedChatId) => {
        set({ selectedChatId });
    },
    setChatHistorySearchQuery: (searchHistoryQuery) => {
        set({ searchHistoryQuery });
    },
    setConversationSearchQuery: (searchQuery) => {
        set({ searchQuery });
    },
    setCurrentMatchIndex: (currentMatchIndex) => {
        set({ currentMatchIndex });
    },
    setTotalMatches: (totalMatches) => {
        set({ totalMatches });
    },
    clearConversationSearch: () => {
        set({
            searchQuery: '',
            currentMatchIndex: 0,
            totalMatches: 0,
        });
    },
    setSelectedWebSearchOption: ({ chatId, optionId }) => {
        set((state) => ({
            selectedWebSearchOptionByChatId: {
                ...state.selectedWebSearchOptionByChatId,
                [chatId]: optionId,
            },
        }));
    },
    ensureChatDefaults: (chatIds) => {
        set((state) => ({
            selectedWebSearchOptionByChatId: applyChatDefaults(state.selectedWebSearchOptionByChatId, chatIds),
        }));
    },
});
