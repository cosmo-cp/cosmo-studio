import { StoreProvider } from '@/app/store-provider';
import { useChatPageState } from '@/features/chat/use-chat-page-state';
import { createMockAppDataSource } from '@/test/mock-app-data-source';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { Chat, NewChat } from 'core/dto';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/chat-transport', () => ({
    createChatTransport: () => ({
        sendMessages: () => Promise.resolve(new ReadableStream()),
        reconnectToStream: () => Promise.resolve(null),
    }),
}));

function buildChat(id: string, overrides: Partial<Chat> = {}): Chat {
    return {
        id,
        createdAt: new Date('2026-03-18T00:00:00.000Z'),
        title: `Chat ${id}`,
        pinned: false,
        pinnedAt: null,
        selectedProvider: 'openai',
        selectedModelId: 'gpt-4.1',
        selectedPersonaId: null,
        selectedAgentId: null,
        selectedRuntime: 'model',
        selected: false,
        lastMessage: null,
        lastMessageAt: null,
        ...overrides,
    };
}

describe('useChatPageState', () => {
    let chats: Chat[];

    beforeEach(() => {
        chats = [
            buildChat('chat-1', { selected: true, title: 'Chat 1' }),
            buildChat('chat-2', { selected: false, title: 'Chat 2' }),
            buildChat('chat-3', { selected: false, title: 'Chat 3' }),
        ];
    });

    function setup(initialChats = chats) {
        let storeChats = [...initialChats];

        const mockBackend = createMockAppDataSource({
            chat: {
                getAllChats: vi.fn(async () => storeChats),
                createChat: vi.fn(async (input: NewChat) => {
                    const newChat = buildChat('new-chat-id', {
                        title: input.title ?? 'New Chat',
                        selected: true,
                    });
                    storeChats = [newChat, ...storeChats.map((c) => ({ ...c, selected: false }))];
                    return newChat;
                }),
                deleteChat: vi.fn(async (chatId: string) => {
                    const chatToDelete = storeChats.find((c) => c.id === chatId);
                    storeChats = storeChats.filter((c) => c.id !== chatId);
                    if (chatToDelete?.selected && storeChats.length > 0) {
                        storeChats[0] = { ...storeChats[0], selected: true };
                    }
                }),
                updateSelectedChat: vi.fn(async (chatId: string) => {
                    storeChats = storeChats.map((c) => ({
                        ...c,
                        selected: c.id === chatId,
                    }));
                }),
            },
        });

        const wrapper = ({ children }: { children: ReactNode }) => (
            <StoreProvider appDataSource={mockBackend}>{children}</StoreProvider>
        );

        return {
            mockBackend,
            hook: renderHook(() => useChatPageState(), { wrapper }),
        };
    }

    it('creates a new chat and selects it by default', async () => {
        const { hook, mockBackend } = setup();

        await waitFor(() => {
            expect(hook.result.current.selectedChat?.id).toBe('chat-1');
        });

        await act(async () => {
            await hook.result.current.createNewChat();
        });

        expect(mockBackend.chat.createChat).toHaveBeenCalledWith({ title: 'New Chat' });
        await waitFor(() => {
            expect(hook.result.current.selectedChat?.id).toBe('new-chat-id');
        });
        expect(hook.result.current.chatHistory[0].id).toBe('new-chat-id');
        expect(hook.result.current.chatHistory[0].selected).toBe(true);
    });

    it('clears active history search query when creating a new chat', async () => {
        const { hook } = setup();

        await waitFor(() => {
            expect(hook.result.current.selectedChat?.id).toBe('chat-1');
        });

        act(() => {
            hook.result.current.searchChatHistory('test-query');
        });

        await act(async () => {
            await hook.result.current.createNewChat();
        });

        await waitFor(() => {
            expect(hook.result.current.selectedChat?.id).toBe('new-chat-id');
        });
    });

    it('deleting the currently selected chat selects the adjacent remaining chat', async () => {
        const { hook, mockBackend } = setup();

        await waitFor(() => {
            expect(hook.result.current.selectedChat?.id).toBe('chat-1');
        });

        // Select chat-2 (middle item)
        await act(async () => {
            await hook.result.current.selectChatById(chats[1]);
        });

        await waitFor(() => {
            expect(hook.result.current.selectedChat?.id).toBe('chat-2');
        });

        // Delete chat-2: chat-3 (next adjacent) should become selected
        await act(async () => {
            await hook.result.current.deleteChatById(chats[1]);
        });

        expect(mockBackend.chat.deleteChat).toHaveBeenCalledWith('chat-2');
        await waitFor(() => {
            expect(hook.result.current.selectedChat?.id).toBe('chat-3');
        });

        // Delete chat-3: chat-1 (previous adjacent) should become selected
        await act(async () => {
            await hook.result.current.deleteChatById(chats[2]);
        });

        await waitFor(() => {
            expect(hook.result.current.selectedChat?.id).toBe('chat-1');
        });
    });

    it('deleting the only remaining chat clears the selected chat', async () => {
        const singleChat = [buildChat('single-chat', { selected: true, title: 'Only Chat' })];
        const { hook } = setup(singleChat);

        await waitFor(() => {
            expect(hook.result.current.selectedChat?.id).toBe('single-chat');
        });

        await act(async () => {
            await hook.result.current.deleteChatById(singleChat[0]);
        });

        await waitFor(() => {
            expect(hook.result.current.selectedChat).toBeNull();
        });
        expect(hook.result.current.chatHistory).toHaveLength(0);
    });

    it('deleting a non-selected chat keeps the currently selected chat selected', async () => {
        const { hook } = setup();

        await waitFor(() => {
            expect(hook.result.current.selectedChat?.id).toBe('chat-1');
        });

        // Delete chat-2 while chat-1 is selected
        await act(async () => {
            await hook.result.current.deleteChatById(chats[1]);
        });

        await waitFor(() => {
            expect(hook.result.current.selectedChat?.id).toBe('chat-1');
        });
        expect(hook.result.current.chatHistory.map((c) => c.id)).toEqual(['chat-1', 'chat-3']);
    });
});
