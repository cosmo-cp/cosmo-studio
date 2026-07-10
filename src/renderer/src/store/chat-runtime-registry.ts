import { Chat } from '@ai-sdk/react';
import { lastAssistantMessageIsCompleteWithApprovalResponses, type ChatStatus, type UIMessage } from 'ai';
import { IpcChatTransport } from '@/chat-transport';

interface ChatRuntimeCallbacks {
    onMessagesChanged: (chatId: string, messages: UIMessage[]) => void;
    onStatusChanged: (chatId: string, status: ChatStatus, error?: Error) => void;
    onError: (chatId: string, error: Error) => void;
}

interface ChatRuntimeEntry {
    chat: Chat<UIMessage>;
    callbacks: ChatRuntimeCallbacks;
    dispose: () => void;
}

const runtimes = new Map<string, ChatRuntimeEntry>();

export const getExistingChatRuntime = (chatId: string): ChatRuntimeEntry | undefined => runtimes.get(chatId);

export const getChatRuntime = (
    chatId: string,
    initialMessages: UIMessage[],
    callbacks: ChatRuntimeCallbacks,
): ChatRuntimeEntry => {
    const existing = runtimes.get(chatId);
    if (existing) {
        existing.callbacks = callbacks;
        return existing;
    }

    const chat = new Chat<UIMessage>({
        id: chatId,
        messages: initialMessages,
        transport: new IpcChatTransport(),
        sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
        onError: (error) => callbacks.onError(chatId, error),
    });

    const unsubscribeMessages = chat['~registerMessagesCallback'](() => {
        const entry = runtimes.get(chatId);
        entry?.callbacks.onMessagesChanged(chatId, chat.messages);
    });
    const unsubscribeStatus = chat['~registerStatusCallback'](() => {
        const entry = runtimes.get(chatId);
        entry?.callbacks.onStatusChanged(chatId, chat.status, chat.error);
    });
    const unsubscribeError = chat['~registerErrorCallback'](() => {
        const entry = runtimes.get(chatId);
        if (chat.error) {
            entry?.callbacks.onError(chatId, chat.error);
        }
    });

    const entry: ChatRuntimeEntry = {
        chat,
        callbacks,
        dispose: () => {
            chat.stop();
            unsubscribeMessages();
            unsubscribeStatus();
            unsubscribeError();
            runtimes.delete(chatId);
        },
    };

    runtimes.set(chatId, entry);
    return entry;
};

export const disposeChatRuntime = (chatId: string): void => {
    runtimes.get(chatId)?.dispose();
};

export const disposeAllChatRuntimes = (): void => {
    for (const entry of runtimes.values()) {
        entry.dispose();
    }
};
