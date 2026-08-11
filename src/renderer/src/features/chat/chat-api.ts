import type { BackendCacheHelpers } from '@/lib/store/backend-hooks';
import { useBackendMutation, useBackendQuery } from '@/lib/store/backend-hooks';
import type { ModelIdentifier, NewChat, PersonaIdentifier } from 'core/dto';

const chatKeys = {
    history: (searchQuery: string | null) => ['chat', 'history', searchQuery ?? null] as const,
    messages: (chatId: string) => ['chat', 'messages', chatId] as const,
};

async function revalidateChatHistory(revalidateMatching: BackendCacheHelpers['revalidateMatching']) {
    await revalidateMatching((key) => Array.isArray(key) && key[0] === 'chat' && key[1] === 'history');
}

export function useGetChatsQuery(searchQuery: string | null) {
    return useBackendQuery(chatKeys.history(searchQuery), (appDataSource) =>
        appDataSource.chat.getAllChats(searchQuery),
    );
}

export function useGetChatMessagesQuery(chatId: string | null | undefined) {
    return useBackendQuery(
        chatId ? chatKeys.messages(chatId) : null,
        (appDataSource) => appDataSource.message.getByChat(chatId ?? ''),
        { skip: !chatId },
    );
}

export function useCreateChatMutation() {
    return useBackendMutation({
        errorMessage: 'Failed to create chat',
        run: (appDataSource, input: NewChat) => appDataSource.chat.createChat(input),
        revalidate: async (_arg, _result, { revalidateMatching }) => {
            await revalidateChatHistory(revalidateMatching);
        },
    });
}

export function useUpdateChatMutation() {
    return useBackendMutation({
        errorMessage: 'Failed to update chat',
        run: (appDataSource, { chatId, updates }: { chatId: string; updates: Partial<NewChat> }) =>
            appDataSource.chat.updateChat(chatId, updates),
        revalidate: async ({ chatId }, _result, { revalidateKeys, revalidateMatching }) => {
            await revalidateKeys([chatKeys.messages(chatId)]);
            await revalidateChatHistory(revalidateMatching);
        },
    });
}

export function useSelectChatMutation() {
    return useBackendMutation({
        errorMessage: 'Failed to select chat',
        run: (appDataSource, chatId: string) => appDataSource.chat.updateSelectedChat(chatId),
        revalidate: async (_arg, _result, { revalidateMatching }) => {
            await revalidateChatHistory(revalidateMatching);
        },
    });
}

export function useDeleteChatMutation() {
    return useBackendMutation({
        errorMessage: 'Failed to delete chat',
        run: (appDataSource, chatId: string) => appDataSource.chat.deleteChat(chatId),
        revalidate: async (chatId, _result, { revalidateKeys, revalidateMatching }) => {
            await revalidateKeys([chatKeys.messages(chatId)]);
            await revalidateChatHistory(revalidateMatching);
        },
    });
}

export function useTogglePinnedChatMutation() {
    return useBackendMutation({
        errorMessage: 'Failed to update chat pin status',
        run: (appDataSource, { chatId, pinned }: { chatId: string; pinned: boolean }) =>
            appDataSource.chat.updatePinnedStatusForChat(chatId, pinned),
        revalidate: async (_arg, _result, { revalidateMatching }) => {
            await revalidateChatHistory(revalidateMatching);
        },
    });
}

export function useUpdateSelectedModelMutation() {
    return useBackendMutation({
        errorMessage: 'Failed to update chat model',
        run: (appDataSource, { chatId, modelIdentifier }: { chatId: string; modelIdentifier: ModelIdentifier }) =>
            appDataSource.chat.updateSelectedModelForChat(chatId, modelIdentifier),
        revalidate: async (_arg, _result, { revalidateMatching }) => {
            await revalidateChatHistory(revalidateMatching);
        },
    });
}

export function useUpdateSelectedAgentMutation() {
    return useBackendMutation({
        errorMessage: 'Failed to update chat agent',
        run: (
            appDataSource,
            {
                chatId,
                agentIdentifier,
            }: {
                chatId: string;
                agentIdentifier: { selectedAgentId: string | null; selectedRuntime: 'agent' | 'model' };
            },
        ) => appDataSource.chat.updateSelectedAgentForChat(chatId, agentIdentifier),
        revalidate: async (_arg, _result, { revalidateMatching }) => {
            await revalidateChatHistory(revalidateMatching);
        },
    });
}

export function useUpdateSelectedPersonaMutation() {
    return useBackendMutation({
        errorMessage: 'Failed to update chat persona',
        run: (appDataSource, { chatId, personaIdentifier }: { chatId: string; personaIdentifier: PersonaIdentifier }) =>
            appDataSource.chat.updateSelectedPersonaForChat(chatId, personaIdentifier),
        revalidate: async (_arg, _result, { revalidateMatching }) => {
            await revalidateChatHistory(revalidateMatching);
        },
    });
}
