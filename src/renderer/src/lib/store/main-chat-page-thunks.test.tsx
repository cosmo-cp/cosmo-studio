import {describe, expect, it} from "vitest";
import type {UIMessage} from "ai";
import type {Chat, ModelIdentifier, PersonaIdentifier} from "core/dto";
import {makeStore} from "@/lib/store/store";
import type {AppDataSource} from "@/lib/app-data-source";
import {setSelectedWebSearchOption} from "@/lib/store/main-chat-page-slice";
import {
    createChat,
    deleteChat,
    loadChatHistory,
    loadChatMessages,
    selectChat,
    togglePinnedChat,
    updateSelectedModel,
    updateSelectedPersona,
} from "@/lib/store/main-chat-page-thunks";
import {createMockAppDataSource} from "@/test/mock-app-data-source";
import {WEB_SEARCH_NONE_OPTION_ID} from "@/lib/web-search-options";

function buildChat(id: string, overrides: Partial<Chat> = {}): Chat {
    return {
        id,
        createdAt: new Date("2026-03-18T00:00:00.000Z"),
        title: `Chat ${id}`,
        pinned: false,
        pinnedAt: null,
        selectedProvider: null,
        selectedModelId: null,
        selectedPersonaId: null,
        selected: false,
        lastMessage: null,
        lastMessageAt: null,
        ...overrides,
    };
}

function createMockChatDataSource() {
    const messages: UIMessage[] = [
        {
            id: "message-1",
            role: "assistant",
            parts: [{type: "text", text: "loaded from thunk"}],
        },
    ];

    let chats = [
        buildChat("chat-1", {selected: true, title: "First chat"}),
        buildChat("chat-2", {title: "Second chat"}),
    ];

    const appDataSource: AppDataSource = createMockAppDataSource({
        chat: {
        async getAllChats() {
            return chats.map((chat) => ({...chat}));
        },
        async getMessagesByChat() {
            return messages.map((message) => ({...message, parts: [...message.parts]}));
        },
        async createChat(input) {
            chats = [
                buildChat("chat-3", {selected: true, title: input.title}),
                ...chats.map((chat) => ({...chat, selected: false})),
            ];
        },
        async updateSelectedChat(chatId) {
            chats = chats.map((chat) => ({...chat, selected: chat.id === chatId}));
        },
        async deleteChat(chatId) {
            chats = chats.filter((chat) => chat.id !== chatId);
            if (!chats.some((chat) => chat.selected) && chats[0]) {
                chats = chats.map((chat, index) => ({...chat, selected: index === 0}));
            }
        },
        async updatePinnedStatusForChat(chatId, pinned) {
            chats = chats.map((chat) =>
                chat.id === chatId ? {...chat, pinned, pinnedAt: pinned ? new Date("2026-03-18T01:00:00.000Z") : null} : chat
            );
        },
        async updateSelectedModelForChat(chatId, identifier: ModelIdentifier) {
            chats = chats.map((chat) =>
                chat.id === chatId ? {
                    ...chat,
                    selectedProvider: identifier.selectedProvider,
                    selectedModelId: identifier.selectedModelId,
                } : chat
            );
        },
        async updateSelectedPersonaForChat(chatId, identifier: PersonaIdentifier) {
            chats = chats.map((chat) =>
                chat.id === chatId ? {
                    ...chat,
                    selectedPersonaId: identifier.selectedPersonaId,
                } : chat
            );
        },
        },
    });

    return {appDataSource, getChats: () => chats};
}

describe("main chat page thunks", () => {
    it("loads history and messages through the injected data source instead of window.api", async () => {
        const {appDataSource} = createMockChatDataSource();
        const store = makeStore({appDataSource});

        await store.dispatch(loadChatHistory(null)).unwrap();
        expect(store.getState().mainChatPage.chatHistory).toHaveLength(2);
        expect(store.getState().mainChatPage.selectedChat?.id).toBe("chat-1");

        const messages = await store.dispatch(loadChatMessages("chat-1")).unwrap();
        expect(messages?.[0]?.parts[0]).toMatchObject({type: "text", text: "loaded from thunk"});
    });

    it("keeps the reducer state in sync for create/select/delete/pin/model/persona thunks", async () => {
        const {appDataSource, getChats} = createMockChatDataSource();
        const store = makeStore({appDataSource});

        await store.dispatch(loadChatHistory(null)).unwrap();
        await store.dispatch(createChat({title: "New thunk chat"})).unwrap();
        expect(store.getState().mainChatPage.selectedChat?.title).toBe("New thunk chat");

        const secondChat = getChats().find((chat) => chat.id === "chat-2");
        expect(secondChat).toBeDefined();

        await store.dispatch(selectChat(secondChat!)).unwrap();
        expect(store.getState().mainChatPage.selectedChat?.id).toBe("chat-2");

        await store.dispatch(togglePinnedChat({chatId: "chat-2", pinned: true})).unwrap();
        expect(store.getState().mainChatPage.chatHistory.find((chat) => chat.id === "chat-2")?.pinned).toBe(true);

        await store.dispatch(
            updateSelectedModel({
                chatId: "chat-2",
                selectedProvider: "provider-a",
                selectedModelId: "model-a",
            })
        ).unwrap();
        expect(store.getState().mainChatPage.selectedChat?.selectedModelId).toBe("model-a");

        await store.dispatch(
            updateSelectedPersona({
                chatId: "chat-2",
                selectedPersonaId: "persona-1",
            })
        ).unwrap();
        expect(store.getState().mainChatPage.selectedChat?.selectedPersonaId).toBe("persona-1");

        await store.dispatch(deleteChat("chat-2")).unwrap();
        expect(store.getState().mainChatPage.chatHistory.some((chat) => chat.id === "chat-2")).toBe(false);
    });

    it("tracks chat-scoped web search selection in Redux without a backend round trip", async () => {
        const {appDataSource} = createMockChatDataSource();
        const store = makeStore({appDataSource});

        await store.dispatch(loadChatHistory(null)).unwrap();
        expect(store.getState().mainChatPage.selectedWebSearchOptionByChatId).toEqual({
            "chat-1": WEB_SEARCH_NONE_OPTION_ID,
            "chat-2": WEB_SEARCH_NONE_OPTION_ID,
        });

        store.dispatch(setSelectedWebSearchOption({
            chatId: "chat-1",
            optionId: "exa",
        }));

        expect(store.getState().mainChatPage.selectedWebSearchOptionByChatId["chat-1"]).toBe("exa");

        await store.dispatch(createChat({title: "Fresh chat"})).unwrap();
        expect(store.getState().mainChatPage.selectedWebSearchOptionByChatId["chat-3"])
            .toBe(WEB_SEARCH_NONE_OPTION_ID);
    });
});
