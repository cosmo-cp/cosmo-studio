import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ChatStatus, FileUIPart, UIMessage } from 'ai';
import type {
    Chat,
    ChatMessageSyncAck,
    CommandDefinition,
    Persona,
    ProviderWithModels,
} from 'core/dto';
import type { AppDispatch, RootState } from './store';
import { disposeChatRuntime, getChatRuntime, getExistingChatRuntime } from './chat-runtime-registry';
import { getErrorMessage, logIpcError } from './chat-errors';

interface ChatSyncState {
    nextSequence: number;
    lastAckedSequence: number;
    pending: number;
    error?: string;
}

interface ChatSessionState {
    messages: UIMessage[];
    status: ChatStatus;
    error?: string;
    sync: ChatSyncState;
}

interface ChatCatalogState {
    providers: ProviderWithModels[];
    personas: Persona[];
    commands: CommandDefinition[];
    loaded: boolean;
}

interface SendChatMessageArgs {
    chatId: string;
    text: string;
    files: FileUIPart[];
}

interface ToolApprovalResponse {
    id: string;
    approved: boolean;
    reason?: string;
}

interface ChatState {
    chats: Chat[];
    selectedChatId: string | null;
    historySearchQuery: string | null;
    conversationSearchQuery: string;
    currentMatchIndex: number;
    totalMatches: number;
    draftsByChatId: Record<string, string>;
    sessionsByChatId: Record<string, ChatSessionState>;
    catalog: ChatCatalogState;
}

const defaultSyncState = (): ChatSyncState => ({
    nextSequence: 0,
    lastAckedSequence: 0,
    pending: 0,
});

const defaultSessionState = (): ChatSessionState => ({
    messages: [],
    status: 'ready',
    sync: defaultSyncState(),
});

const initialState: ChatState = {
    chats: [],
    selectedChatId: null,
    historySearchQuery: null,
    conversationSearchQuery: '',
    currentMatchIndex: 0,
    totalMatches: 0,
    draftsByChatId: {},
    sessionsByChatId: {},
    catalog: {
        providers: [],
        personas: [],
        commands: [],
        loaded: false,
    },
};

const syncQueues = new Map<string, Promise<ChatMessageSyncAck>>();

const getOrCreateSession = (state: ChatState, chatId: string): ChatSessionState => {
    state.sessionsByChatId[chatId] ??= defaultSessionState();
    return state.sessionsByChatId[chatId];
};

const extractText = (message: UIMessage | undefined): string | undefined => {
    if (!message) {
        return undefined;
    }
    return message.parts.find((part): part is { type: 'text'; text: string } => part.type === 'text')?.text;
};

const applyMessageSummary = (state: ChatState, chatId: string, messages: UIMessage[]): void => {
    const chat = state.chats.find((item) => item.id === chatId);
    if (!chat) {
        return;
    }

    const lastText = extractText(messages[messages.length - 1]);
    if (lastText) {
        chat.lastMessage = lastText.slice(0, 200);
        chat.lastMessageAt = new Date();
    }

    if (chat.title === 'New Chat') {
        const firstUserText = extractText(messages.find((message) => message.role === 'user'));
        if (firstUserText) {
            chat.title = firstUserText.slice(0, 50);
        }
    }
};

const runIpc = async <T>(operation: string, call: () => Promise<T>): Promise<T> => {
    try {
        return await call();
    } catch (error) {
        logIpcError(operation, error);
        throw error;
    }
};

const parsePersonaDirective = (text: string) => {
    const match = text.match(/^\s*@persona(?:\s*[:=])?\s*(?:"([^"]+)"|'([^']+)'|([^\s]+))\s*/i);
    if (!match) {
        return { text };
    }

    return {
        text: text.slice(match[0].length).trimStart(),
    };
};

const selectedModelMetadata = (chat: Chat) => ({
    modelId: `${chat.selectedProvider}:${chat.selectedModelId}`,
    personaId: chat.selectedPersonaId ?? null,
});

const getRuntimeForDispatch = (chatId: string, state: ChatState, dispatch: AppDispatch) =>
    getChatRuntime(chatId, state.sessionsByChatId[chatId]?.messages ?? [], {
        onMessagesChanged: (runtimeChatId, messages) => {
            dispatch(chatActions.runtimeMessagesChanged({ chatId: runtimeChatId, messages }));
            void dispatch(syncRuntimeMessages({ chatId: runtimeChatId, messages }));
        },
        onStatusChanged: (runtimeChatId, status, error) => {
            dispatch(chatActions.runtimeStatusChanged({ chatId: runtimeChatId, status, error: error?.message }));
        },
        onError: (runtimeChatId, error) => {
            dispatch(chatActions.runtimeStatusChanged({ chatId: runtimeChatId, status: 'error', error: error.message }));
        },
    });

export const loadChatCatalog = createAsyncThunk('chat/loadCatalog', async () => {
    return runIpc('load chat catalog', async () => {
        const [providers, personas, commands] = await Promise.all([
            window.api.modelProvider.getProvidersWithModels(),
            window.api.persona.getAll(),
            window.api.command.listAll(),
        ]);
        return { providers, personas, commands };
    });
});

export const loadChats = createAsyncThunk('chat/loadChats', async (_: void, { dispatch, getState }) => {
    const query = (getState() as RootState).chat.historySearchQuery;
    const chats = await runIpc('load chats', () => window.api.chat.getAllChats(query));
    const selectedChat = chats.find((chat) => chat.selected) ?? chats[0] ?? null;
    if (selectedChat) {
        void (dispatch as AppDispatch)(loadMessages(selectedChat.id));
    }
    return chats;
});

export const loadMessages = createAsyncThunk('chat/loadMessages', async (chatId: string, { getState }) => {
    const existingRuntime = getExistingChatRuntime(chatId);
    if (existingRuntime && existingRuntime.chat.messages.length > 0) {
        return {
            chatId,
            messages: existingRuntime.chat.messages,
        };
    }

    const existingMessages = (getState() as RootState).chat.sessionsByChatId[chatId]?.messages;
    if (existingRuntime && existingMessages) {
        return {
            chatId,
            messages: existingMessages,
        };
    }

    const messages = await runIpc('load chat messages', () => window.api.message.getByChat(chatId));
    return { chatId, messages };
});

export const createChat = createAsyncThunk('chat/createChat', async (_: void, { dispatch }) => {
    await runIpc('create chat', () => window.api.chat.createChat({ title: 'New Chat' }));
    await (dispatch as AppDispatch)(loadChats()).unwrap();
});

export const selectChat = createAsyncThunk('chat/selectChat', async (chatId: string, { dispatch }) => {
    await runIpc('select chat', () => window.api.chat.updateSelectedChat(chatId));
    dispatch(chatActions.chatSelected(chatId));
    await (dispatch as AppDispatch)(loadMessages(chatId)).unwrap();
});

export const deleteChat = createAsyncThunk('chat/deleteChat', async (chatId: string, { dispatch }) => {
    await runIpc('delete chat', () => window.api.chat.deleteChat(chatId));
    disposeChatRuntime(chatId);
    await (dispatch as AppDispatch)(loadChats()).unwrap();
});

export const togglePinnedChat = createAsyncThunk(
    'chat/togglePinned',
    async ({ chatId, pinned }: { chatId: string; pinned: boolean }, { dispatch }) => {
        await runIpc('toggle chat pin', () => window.api.chat.updatePinnedStatusForChat(chatId, !pinned));
        await (dispatch as AppDispatch)(loadChats()).unwrap();
    },
);

export const updateSelectedModel = createAsyncThunk(
    'chat/updateSelectedModel',
    async ({ chatId, providerName, modelId }: { chatId: string; providerName: string; modelId: string }, { dispatch }) => {
        try {
            await runIpc('update selected model', () =>
                window.api.chat.updateSelectedModelForChat(chatId, {
                    selectedProvider: providerName,
                    selectedModelId: modelId,
                }),
            );
        } catch (error) {
            void (dispatch as AppDispatch)(loadChats());
            throw error;
        }
    },
);

export const updateSelectedPersona = createAsyncThunk(
    'chat/updateSelectedPersona',
    async ({ chatId, personaId }: { chatId: string; personaId: string | null }, { dispatch }) => {
        try {
            await runIpc('update selected persona', () =>
                window.api.chat.updateSelectedPersonaForChat(chatId, {
                    selectedPersonaId: personaId,
                }),
            );
        } catch (error) {
            void (dispatch as AppDispatch)(loadChats());
            throw error;
        }
    },
);

export const syncRuntimeMessages = createAsyncThunk(
    'chat/syncMessages',
    async ({ chatId, messages }: { chatId: string; messages: UIMessage[] }, { dispatch, getState }) => {
        const session = (getState() as RootState).chat.sessionsByChatId[chatId];
        const sequence = (session?.sync.nextSequence ?? 0) + 1;
        dispatch(chatActions.syncQueued({ chatId, sequence }));

        const previous = syncQueues.get(chatId) ?? Promise.resolve({ chatId, sequence: 0, accepted: true });
        const queued = previous
            .catch(() => ({ chatId, sequence: 0, accepted: false }))
            .then(() =>
                runIpc('sync chat messages', () =>
                    window.api.message.syncForChat({
                        chatId,
                        sequence,
                        messages,
                    }),
                ),
            );

        syncQueues.set(chatId, queued);
        return queued;
    },
);

export const sendChatMessage = createAsyncThunk(
    'chat/sendMessage',
    async ({ chatId, text, files }: SendChatMessageArgs, { dispatch, getState }) => {
        const state = (getState() as RootState).chat;
        const chat = state.chats.find((item) => item.id === chatId);
        if (!chat?.selectedProvider || !chat.selectedModelId) {
            throw new Error('Select a model before sending a message.');
        }

        const metadata = selectedModelMetadata(chat);
        const { text: cleanedText } = parsePersonaDirective(text);
        let resolvedText = cleanedText;

        if (cleanedText.trim().startsWith('/')) {
            const result = await runIpc('execute command', () =>
                window.api.command.execute({
                    input: cleanedText,
                }),
            );
            resolvedText = result.resolvedText;
        }

        const runtime = getRuntimeForDispatch(chatId, state, dispatch as AppDispatch);

        await runtime.chat.sendMessage(
            {
                text: resolvedText,
                files,
                metadata,
            },
            { metadata },
        );
    },
);

export const regenerateChatResponse = createAsyncThunk(
    'chat/regenerate',
    async ({ chatId, messageId }: { chatId: string; messageId?: string }, { dispatch, getState }) => {
        const state = (getState() as RootState).chat;
        const chat = state.chats.find((item) => item.id === chatId);
        if (!chat?.selectedProvider || !chat.selectedModelId) {
            throw new Error('Select a model before regenerating a response.');
        }

        const runtime = getRuntimeForDispatch(chatId, state, dispatch as AppDispatch);

        await runtime.chat.regenerate({
            messageId,
            metadata: selectedModelMetadata(chat),
        });
    },
);

export const approveToolCall = createAsyncThunk(
    'chat/approveTool',
    async ({ chatId, response }: { chatId: string; response: ToolApprovalResponse }, { dispatch, getState }) => {
        const state = (getState() as RootState).chat;
        const runtime = getRuntimeForDispatch(chatId, state, dispatch as AppDispatch);
        await runtime.chat.addToolApprovalResponse(response);
    },
);

export const stopChatResponse = createAsyncThunk('chat/stopChat', async (chatId: string, { dispatch, getState }) => {
    const state = (getState() as RootState).chat;
    const runtime = getRuntimeForDispatch(chatId, state, dispatch as AppDispatch);
    runtime.chat.stop();
});

export const chatSlice = createSlice({
    name: 'chat',
    initialState,
    reducers: {
        historySearchChanged(state, action: PayloadAction<string | null>) {
            state.historySearchQuery = action.payload;
        },
        chatSelected(state, action: PayloadAction<string>) {
            state.selectedChatId = action.payload;
            for (const chat of state.chats) {
                chat.selected = chat.id === action.payload;
            }
            getOrCreateSession(state, action.payload);
        },
        conversationSearchChanged(state, action: PayloadAction<string>) {
            state.conversationSearchQuery = action.payload;
            if (!action.payload) {
                state.currentMatchIndex = 0;
                state.totalMatches = 0;
            }
        },
        matchesFound(state, action: PayloadAction<number>) {
            state.totalMatches = action.payload;
            if (action.payload > 0) {
                if (state.currentMatchIndex === 0) {
                    state.currentMatchIndex = 1;
                } else if (state.currentMatchIndex > action.payload) {
                    state.currentMatchIndex = action.payload;
                }
            } else {
                state.currentMatchIndex = 0;
            }
        },
        nextMatch(state) {
            if (state.totalMatches > 0) {
                state.currentMatchIndex =
                    state.currentMatchIndex < state.totalMatches ? state.currentMatchIndex + 1 : 1;
            }
        },
        previousMatch(state) {
            if (state.totalMatches > 0) {
                state.currentMatchIndex =
                    state.currentMatchIndex > 1 ? state.currentMatchIndex - 1 : state.totalMatches;
            }
        },
        clearConversationSearch(state) {
            state.conversationSearchQuery = '';
            state.currentMatchIndex = 0;
            state.totalMatches = 0;
        },
        draftChanged(state, action: PayloadAction<{ chatId: string; draft: string }>) {
            state.draftsByChatId[action.payload.chatId] = action.payload.draft;
        },
        runtimeMessagesChanged(state, action: PayloadAction<{ chatId: string; messages: UIMessage[] }>) {
            const session = getOrCreateSession(state, action.payload.chatId);
            session.messages = action.payload.messages;
            applyMessageSummary(state, action.payload.chatId, action.payload.messages);
        },
        runtimeStatusChanged(
            state,
            action: PayloadAction<{ chatId: string; status: ChatStatus; error?: string }>,
        ) {
            const session = getOrCreateSession(state, action.payload.chatId);
            session.status = action.payload.status;
            session.error = action.payload.error;
        },
        syncQueued(state, action: PayloadAction<{ chatId: string; sequence: number }>) {
            const sync = getOrCreateSession(state, action.payload.chatId).sync;
            sync.nextSequence = action.payload.sequence;
            sync.pending += 1;
            sync.error = undefined;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(loadChatCatalog.fulfilled, (state, action) => {
                state.catalog = {
                    providers: action.payload.providers,
                    personas: action.payload.personas,
                    commands: action.payload.commands,
                    loaded: true,
                };
            })
            .addCase(loadChats.fulfilled, (state, action) => {
                state.chats = action.payload;
                state.selectedChatId = action.payload.find((chat) => chat.selected)?.id ?? action.payload[0]?.id ?? null;
                if (state.selectedChatId) {
                    getOrCreateSession(state, state.selectedChatId);
                }
            })
            .addCase(loadChats.rejected, (state) => {
                state.chats = [];
                state.selectedChatId = null;
            })
            .addCase(loadMessages.fulfilled, (state, action) => {
                const session = getOrCreateSession(state, action.payload.chatId);
                session.messages = action.payload.messages;
                session.error = undefined;
            })
            .addCase(loadMessages.rejected, (state, action) => {
                const chatId = action.meta.arg;
                getOrCreateSession(state, chatId).error = getErrorMessage(action.error.message);
            })
            .addCase(updateSelectedModel.pending, (state, action) => {
                const chat = state.chats.find((item) => item.id === action.meta.arg.chatId);
                if (chat) {
                    chat.selectedProvider = action.meta.arg.providerName;
                    chat.selectedModelId = action.meta.arg.modelId;
                }
            })
            .addCase(updateSelectedPersona.pending, (state, action) => {
                const chat = state.chats.find((item) => item.id === action.meta.arg.chatId);
                if (chat) {
                    chat.selectedPersonaId = action.meta.arg.personaId;
                }
            })
            .addCase(syncRuntimeMessages.fulfilled, (state, action) => {
                const sync = getOrCreateSession(state, action.payload.chatId).sync;
                sync.pending = Math.max(0, sync.pending - 1);
                if (action.payload.accepted) {
                    sync.lastAckedSequence = Math.max(sync.lastAckedSequence, action.payload.sequence);
                }
            })
            .addCase(syncRuntimeMessages.rejected, (state, action) => {
                const chatId = action.meta.arg.chatId;
                const sync = getOrCreateSession(state, chatId).sync;
                sync.pending = Math.max(0, sync.pending - 1);
                sync.error = getErrorMessage(action.error.message);
            });
    },
});

export const chatActions = chatSlice.actions;
export const chatReducer = chatSlice.reducer;

export const selectChats = (state: RootState) => state.chat.chats;
export const selectSelectedChat = (state: RootState) =>
    state.chat.chats.find((chat) => chat.id === state.chat.selectedChatId) ?? null;
export const selectSelectedMessages = (state: RootState) =>
    state.chat.selectedChatId ? state.chat.sessionsByChatId[state.chat.selectedChatId]?.messages ?? [] : [];
export const selectSelectedStatus = (state: RootState) =>
    state.chat.selectedChatId ? state.chat.sessionsByChatId[state.chat.selectedChatId]?.status ?? 'ready' : 'ready';
