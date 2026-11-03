import { createChatTransport } from '@/chat-transport';
import type { AppDataSource } from '@/lib/store/app-data-source';
import { Chat } from '@ai-sdk/react';
import { lastAssistantMessageIsCompleteWithApprovalResponses, type UIMessage } from 'ai';
import { toast } from 'sonner';

// Keep streams alive independently of whichever conversation is mounted.
export class ChatSessionRegistry {
    private readonly chats = new Map<string, Promise<Chat<UIMessage>>>();
    private readonly sessions = new Map<string, Chat<UIMessage>>();
    private readonly listeners = new Set<() => void>();
    private readonly deleting = new Set<string>();
    private version = 0;
    private disposed = false;

    constructor(
        private readonly backend: AppDataSource,
        private readonly changed: () => void,
    ) {}

    // Subscribe history indicators without coupling them to the active conversation.
    public subscribe = (listener: () => void) => {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    };

    public snapshot = () => this.version;

    private notify() {
        this.version++;
        this.listeners.forEach((listener) => listener());
    }

    public isRunning(id: string) {
        const status = this.sessions.get(id)?.status;
        return status === 'submitted' || status === 'streaming';
    }

    public isDeleting(id: string) {
        return this.deleting.has(id);
    }

    // Load history before exposing a session so a late query cannot overwrite a stream.
    public acquire(id: string): Promise<Chat<UIMessage>> {
        if (this.disposed) return Promise.reject(new Error('Chat session registry is closed'));
        const existing = this.chats.get(id);
        if (existing) return existing;
        const pending = this.backend.message
            .getByChat(id)
            .then((messages) => {
                if (this.disposed) throw new Error('Chat session registry is closed');
                if (this.chats.get(id) !== pending) throw new Error('Chat session is no longer available');
                const chat = new Chat<UIMessage>({
                    id,
                    messages,
                    transport: createChatTransport(),
                    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
                    onFinish: ({ message, messages: all, isAbort, isError, isDisconnect }) => {
                        if (
                            isAbort ||
                            isError ||
                            isDisconnect ||
                            this.deleting.has(id) ||
                            this.sessions.get(id) !== chat
                        )
                            return;
                        const text = message.parts.find((part) => part.type === 'text')?.text;
                        const users = all.filter((item) => item.role === 'user');
                        const firstText = users[0]?.parts.find((part) => part.type === 'text')?.text;
                        const updates = {
                            ...(text ? { lastMessage: text.slice(0, 200) } : {}),
                            ...(users.length === 1 && firstText ? { title: firstText.slice(0, 50) } : {}),
                        };
                        void this.backend.chat.updateChat(id, updates).then(this.changed).catch(console.error);
                    },
                    onError: (error) => toast.error('Failed to stream data', { description: error.message }),
                });
                chat['~registerStatusCallback'](() => this.notify());
                this.sessions.set(id, chat);
                this.notify();
                return chat;
            })
            .catch((error) => {
                if (this.chats.get(id) === pending) this.chats.delete(id);
                throw error;
            });
        this.chats.set(id, pending);
        return pending;
    }

    // Disable the conversation while the backend cancels and deletes its run.
    public async beginDeletion(id: string) {
        this.deleting.add(id);
        this.notify();
        await this.sessions.get(id)?.stop();
    }

    // Retain the stopped session on failure; forget it only after successful deletion.
    public endDeletion(id: string, success: boolean) {
        this.deleting.delete(id);
        if (success) {
            this.sessions.delete(id);
            this.chats.delete(id);
        }
        this.notify();
    }

    public dispose() {
        this.disposed = true;
        for (const chat of this.sessions.values()) void chat.stop();
        this.sessions.clear();
        this.chats.clear();
    }
}
