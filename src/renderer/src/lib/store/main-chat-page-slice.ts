import {createSlice, type PayloadAction} from "@reduxjs/toolkit";
import type {Chat} from "core/dto";
import {
    createChat,
    deleteChat,
    loadChatHistory,
    selectChat,
    togglePinnedChat,
    updateSelectedModel,
    updateSelectedPersona,
} from "@/lib/store/main-chat-page-thunks";
import {WEB_SEARCH_NONE_OPTION_ID} from "@/lib/web-search-options";

export interface MainChatPageState {
    chatHistory: Chat[];
    selectedChat: Chat | null;
    searchHistoryQuery: string | null;
    searchQuery: string;
    currentMatchIndex: number;
    totalMatches: number;
    selectedWebSearchOptionByChatId: Record<string, string>;
}

interface UpdateChatInHistoryPayload {
    chatId: string;
    updates: Partial<Chat>;
}

interface SetSelectedWebSearchOptionPayload {
    chatId: string;
    optionId: string;
}

// Keep page-scoped Redux state resettable so the route behaves like the old local state model.
function createInitialState(): MainChatPageState {
    return {
        chatHistory: [],
        selectedChat: null,
        searchHistoryQuery: null,
        searchQuery: "",
        currentMatchIndex: 0,
        totalMatches: 0,
        selectedWebSearchOptionByChatId: {},
    };
}

// Preserve any existing per-chat selector state while giving newly loaded chats a safe default.
function applyChatHistory(state: MainChatPageState, chats: Chat[]) {
    state.chatHistory = chats;
    state.selectedChat = chats.find((chat) => chat.selected) ?? chats[0] ?? null;
    state.selectedWebSearchOptionByChatId = Object.fromEntries(
        chats.map((chat) => [
            chat.id,
            state.selectedWebSearchOptionByChatId[chat.id] ?? WEB_SEARCH_NONE_OPTION_ID,
        ])
    );
}

const mainChatPageSlice = createSlice({
    name: "mainChatPage",
    initialState: createInitialState(),
    reducers: {
        setChatHistorySearchQuery(state, action: PayloadAction<string | null>) {
            state.searchHistoryQuery = action.payload;
        },
        setConversationSearchQuery(state, action: PayloadAction<string>) {
            state.searchQuery = action.payload;
        },
        setCurrentMatchIndex(state, action: PayloadAction<number>) {
            state.currentMatchIndex = action.payload;
        },
        setTotalMatches(state, action: PayloadAction<number>) {
            state.totalMatches = action.payload;
        },
        clearConversationSearch(state) {
            state.searchQuery = "";
            state.currentMatchIndex = 0;
            state.totalMatches = 0;
        },
        setSelectedWebSearchOption(state, action: PayloadAction<SetSelectedWebSearchOptionPayload>) {
            state.selectedWebSearchOptionByChatId[action.payload.chatId] = action.payload.optionId;
        },
        updateChatInHistory(state, action: PayloadAction<UpdateChatInHistoryPayload>) {
            const {chatId, updates} = action.payload;
            state.chatHistory = state.chatHistory.map((chat) =>
                chat.id === chatId ? {...chat, ...updates} : chat
            );
            if (state.selectedChat?.id === chatId) {
                state.selectedChat = {...state.selectedChat, ...updates};
            }
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(loadChatHistory.fulfilled, (state, action) => {
                applyChatHistory(state, action.payload);
            })
            .addCase(createChat.fulfilled, (state, action) => {
                applyChatHistory(state, action.payload);
            })
            .addCase(deleteChat.fulfilled, (state, action) => {
                applyChatHistory(state, action.payload);
            })
            .addCase(togglePinnedChat.fulfilled, (state, action) => {
                applyChatHistory(state, action.payload);
            })
            .addCase(selectChat.fulfilled, (state, action) => {
                state.selectedChat = action.payload;
                state.chatHistory = state.chatHistory.map((chat) => ({
                    ...chat,
                    selected: chat.id === action.payload.id,
                }));
            })
            .addCase(updateSelectedModel.fulfilled, (state, action) => {
                const {chatId, updates} = action.payload;
                state.chatHistory = state.chatHistory.map((chat) =>
                    chat.id === chatId ? {...chat, ...updates} : chat
                );
                if (state.selectedChat?.id === chatId) {
                    state.selectedChat = {...state.selectedChat, ...updates};
                }
            })
            .addCase(updateSelectedPersona.fulfilled, (state, action) => {
                const {chatId, updates} = action.payload;
                state.chatHistory = state.chatHistory.map((chat) =>
                    chat.id === chatId ? {...chat, ...updates} : chat
                );
                if (state.selectedChat?.id === chatId) {
                    state.selectedChat = {...state.selectedChat, ...updates};
                }
            });
    },
});

export const {
    clearConversationSearch,
    setChatHistorySearchQuery,
    setConversationSearchQuery,
    setCurrentMatchIndex,
    setSelectedWebSearchOption,
    setTotalMatches,
    updateChatInHistory,
} = mainChatPageSlice.actions;

export const mainChatPageReducer = mainChatPageSlice.reducer;
