import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type {Chat} from "core/dto";
import {WEB_SEARCH_NONE_OPTION_ID} from "@/lib/web-search-options";
import type {AppThunkExtra, RootState} from '@/lib/store/store';
import { UIMessage } from 'ai';

export interface ChatState {
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
function createInitialState(): ChatState {
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
function applyChatHistory(state: ChatState, chats: Chat[]) {
    state.chatHistory = chats;
    state.selectedChat = chats.find((chat) => chat.selected) ?? chats[0] ?? null;
    state.selectedWebSearchOptionByChatId = Object.fromEntries(
        chats.map((chat) => [
            chat.id,
            state.selectedWebSearchOptionByChatId[chat.id] ?? WEB_SEARCH_NONE_OPTION_ID,
        ])
    );
}

const chatSlice = createSlice({
    name: "chat",
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


const createChatAsyncThunk = createAsyncThunk.withTypes<{
    extra: AppThunkExtra;
    state: RootState;
    rejectValue: string;
}>();

function getErrorMessage(error: unknown, fallbackMessage: string): string {
    return error instanceof Error ? error.message : fallbackMessage;
}

async function reloadChatsFromCurrentSearch(
    extra: AppThunkExtra,
    searchQuery: string | null
): Promise<Chat[]> {
    return extra.appDataSource.chat.getAllChats(searchQuery);
}

export const loadChatHistory = createChatAsyncThunk<
    Chat[],
    string | null
>("mainChatPage/loadChatHistory", async (searchQuery, {extra, rejectWithValue}) => {
    try {
        return await extra.appDataSource.chat.getAllChats(searchQuery ?? null);
    } catch (error) {
        return rejectWithValue(getErrorMessage(error, "Failed to load chats"));
    }
});

export const loadChatMessages = createChatAsyncThunk<
    UIMessage[] | null,
    string
>("mainChatPage/loadChatMessages", async (chatId, {extra, rejectWithValue}) => {
    try {
        return await extra.appDataSource.chat.getMessagesByChat(chatId);
    } catch (error) {
        return rejectWithValue(getErrorMessage(error, "Failed to load chat messages"));
    }
});

export const createChat = createChatAsyncThunk<
    Chat[],
    {title: string}
>("mainChatPage/createChat", async (input, {extra, getState, rejectWithValue}) => {
    try {
        await extra.appDataSource.chat.createChat(input);
        return reloadChatsFromCurrentSearch(extra, getState().chat.searchHistoryQuery);
    } catch (error) {
        return rejectWithValue(getErrorMessage(error, "Failed to create chat"));
    }
});

export const selectChat = createChatAsyncThunk<Chat, Chat>(
    "mainChatPage/selectChat",
    async (chat, {extra, rejectWithValue}) => {
        try {
            await extra.appDataSource.chat.updateSelectedChat(chat.id);
            return chat;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error, "Failed to select chat"));
        }
    }
);

export const deleteChat = createChatAsyncThunk<Chat[], string>(
    "mainChatPage/deleteChat",
    async (chatId, {extra, getState, rejectWithValue}) => {
        try {
            await extra.appDataSource.chat.deleteChat(chatId);
            return reloadChatsFromCurrentSearch(extra, getState().chat.searchHistoryQuery);
        } catch (error) {
            return rejectWithValue(getErrorMessage(error, "Failed to delete chat"));
        }
    }
);

export const togglePinnedChat = createChatAsyncThunk<
    Chat[],
    {chatId: string; pinned: boolean}
>("mainChatPage/togglePinnedChat", async ({chatId, pinned}, {extra, getState, rejectWithValue}) => {
    try {
        await extra.appDataSource.chat.updatePinnedStatusForChat(chatId, pinned);
        return reloadChatsFromCurrentSearch(extra, getState().chat.searchHistoryQuery);
    } catch (error) {
        return rejectWithValue(getErrorMessage(error, "Failed to update chat pin status"));
    }
});

export const updateSelectedModel = createChatAsyncThunk<
    {chatId: string; updates: Pick<Chat, "selectedProvider" | "selectedModelId">},
    {chatId: string; selectedProvider: string; selectedModelId: string}
>("mainChatPage/updateSelectedModel", async (input, {extra, rejectWithValue}) => {
    try {
        await extra.appDataSource.chat.updateSelectedModelForChat(input.chatId, {
            selectedProvider: input.selectedProvider,
            selectedModelId: input.selectedModelId,
        });

        return {
            chatId: input.chatId,
            updates: {
                selectedProvider: input.selectedProvider,
                selectedModelId: input.selectedModelId,
            },
        };
    } catch (error) {
        return rejectWithValue(getErrorMessage(error, "Failed to update chat model"));
    }
});

export const updateSelectedPersona = createChatAsyncThunk<
    {chatId: string; updates: Pick<Chat, "selectedPersonaId">},
    {chatId: string; selectedPersonaId: string | null}
>("mainChatPage/updateSelectedPersona", async (input, {extra, rejectWithValue}) => {
    try {
        await extra.appDataSource.chat.updateSelectedPersonaForChat(input.chatId, {
            selectedPersonaId: input.selectedPersonaId,
        });

        return {
            chatId: input.chatId,
            updates: {
                selectedPersonaId: input.selectedPersonaId,
            },
        };
    } catch (error) {
        return rejectWithValue(getErrorMessage(error, "Failed to update chat persona"));
    }
});


export const {
    clearConversationSearch,
    setChatHistorySearchQuery,
    setConversationSearchQuery,
    setCurrentMatchIndex,
    setSelectedWebSearchOption,
    setTotalMatches,
    updateChatInHistory,
} = chatSlice.actions;

export const chatReducer = chatSlice.reducer;
