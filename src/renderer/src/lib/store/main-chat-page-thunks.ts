import {createAsyncThunk} from "@reduxjs/toolkit";
import type {UIMessage} from "ai";
import type {Chat} from "core/dto";
import type {AppThunkExtra} from "@/lib/store/store";
import type {MainChatPageState} from "@/lib/store/main-chat-page-slice";

type MainChatPageThunkState = {
    mainChatPage: MainChatPageState;
};

const createMainChatPageAsyncThunk = createAsyncThunk.withTypes<{
    extra: AppThunkExtra;
    state: MainChatPageThunkState;
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

export const loadChatHistory = createMainChatPageAsyncThunk<
    Chat[],
    string | null | undefined
>("mainChatPage/loadChatHistory", async (searchQuery, {extra, rejectWithValue}) => {
    try {
        return await extra.appDataSource.chat.getAllChats(searchQuery ?? null);
    } catch (error) {
        return rejectWithValue(getErrorMessage(error, "Failed to load chats"));
    }
});

export const loadChatMessages = createMainChatPageAsyncThunk<
    UIMessage[] | null,
    string
>("mainChatPage/loadChatMessages", async (chatId, {extra, rejectWithValue}) => {
    try {
        return await extra.appDataSource.chat.getMessagesByChat(chatId);
    } catch (error) {
        return rejectWithValue(getErrorMessage(error, "Failed to load chat messages"));
    }
});

export const createChat = createMainChatPageAsyncThunk<
    Chat[],
    {title: string}
>("mainChatPage/createChat", async (input, {extra, getState, rejectWithValue}) => {
    try {
        await extra.appDataSource.chat.createChat(input);
        return reloadChatsFromCurrentSearch(extra, getState().mainChatPage.searchHistoryQuery);
    } catch (error) {
        return rejectWithValue(getErrorMessage(error, "Failed to create chat"));
    }
});

export const selectChat = createMainChatPageAsyncThunk<Chat, Chat>(
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

export const deleteChat = createMainChatPageAsyncThunk<Chat[], string>(
    "mainChatPage/deleteChat",
    async (chatId, {extra, getState, rejectWithValue}) => {
        try {
            await extra.appDataSource.chat.deleteChat(chatId);
            return reloadChatsFromCurrentSearch(extra, getState().mainChatPage.searchHistoryQuery);
        } catch (error) {
            return rejectWithValue(getErrorMessage(error, "Failed to delete chat"));
        }
    }
);

export const togglePinnedChat = createMainChatPageAsyncThunk<
    Chat[],
    {chatId: string; pinned: boolean}
>("mainChatPage/togglePinnedChat", async ({chatId, pinned}, {extra, getState, rejectWithValue}) => {
    try {
        await extra.appDataSource.chat.updatePinnedStatusForChat(chatId, pinned);
        return reloadChatsFromCurrentSearch(extra, getState().mainChatPage.searchHistoryQuery);
    } catch (error) {
        return rejectWithValue(getErrorMessage(error, "Failed to update chat pin status"));
    }
});

export const updateSelectedModel = createMainChatPageAsyncThunk<
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

export const updateSelectedPersona = createMainChatPageAsyncThunk<
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
