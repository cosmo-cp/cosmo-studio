'use client'
import { JSX, useCallback, useEffect, useMemo, useState } from "react";
import { ChatHistory } from "@/components/chat-history";
import { Chat } from "core/dto";
import { ChatHeader } from "@/components/chat-header";
import { Messages } from "@/components/messages";
import { MultimodalInput } from "@/components/multimodal-input";
import { useChat } from "@ai-sdk/react";
import { IpcChatTransport } from "@/chat-transport";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { MessageCirclePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { lastAssistantMessageIsCompleteWithApprovalResponses, UIMessage } from "ai";
import { toast } from "sonner"
import { logger } from "../../../logger";

export default function Page(): JSX.Element {
    const [chatHistory, setChatHistory] = useState<Chat[]>([]);
    const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
    const [refreshHistory, setRefreshHistory] = useState(false);
    const [searchHistoryQuery, setSearchHistoryQuery] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
    const [totalMatches, setTotalMatches] = useState(0);
    const transport = useMemo(() => new IpcChatTransport(), []);

    const updateChatInHistory = useCallback((chatId: string, updates: Partial<Chat>) => {
        setChatHistory(prev =>
            prev.map(c => c.id === chatId ? { ...c, ...updates } : c)
        );
        setSelectedChat(prev =>
            prev && prev.id === chatId ? { ...prev, ...updates } : prev
        );
    }, []);

    const {
        messages,
        sendMessage,
        status,
        regenerate,
        setMessages,
        addToolApprovalResponse,
        stop
    } = useChat<UIMessage>({
        id: selectedChat?.id,
        transport,
        sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
        onFinish: ({ message }) => {
            // locally update the chat history
            if (!selectedChat) return;
            const textPart = message.parts?.find(p => p.type === 'text') as { type: 'text'; text: string } | undefined;
            const text = textPart?.text;
            const updates: Partial<Chat> = {
                lastMessage: text ? text.slice(0, 200) : selectedChat.lastMessage,
                lastMessageAt: new Date(),
            };
            // Update title on first exchange (matches backend logic in MessageRepository)
            const userMessages = messages.filter(m => m.role === 'user');
            if (userMessages.length === 1) {
                const userTextPart = userMessages[0].parts?.find(p => p.type === 'text') as { type: 'text'; text: string } | undefined;
                if (userTextPart?.text) {
                    updates.title = userTextPart.text.slice(0, 50);
                }
            }
            updateChatInHistory(selectedChat.id, updates);
        },
        onError: (error) => {
            toast.error("Failed to Stream Data", {
                description: error.message,
            })
        },
    });

    useEffect(() => {
        let active = true;
        window.api.chat.getAllChats(searchHistoryQuery)
            .then((chats) => {
                if (!active) {
                    return;
                }
                setChatHistory(chats);
                if (chats.length > 0) {
                    setSelectedChat(chats.find(chat => chat.selected) ?? chats[0]);
                } else {
                    setSelectedChat(null);
                    setMessages([]);
                }
                setRefreshHistory(false);
            })
            .catch((error) => {
                if (!active) {
                    return;
                }
                logger.error(error);
                toast.error("Failed to load chats");
                setRefreshHistory(false);
            });

        return () => {
            active = false;
        };
    }, [refreshHistory, searchHistoryQuery, setMessages]);

    useEffect(() => {
        if (!selectedChat?.id) {
            setMessages([]);
            return;
        }

        let active = true;
        const chatId = selectedChat.id;
        window.api.message.getByChat(chatId)
            .then((chat) => {
                if (!active || selectedChat.id !== chatId) {
                    return;
                }
                if (chat) {
                    setMessages(chat);
                }
            })
            .catch((error) => {
                if (!active) {
                    return;
                }
                logger.error(error);
                toast.error("Failed to load chat messages");
            });

        return () => {
            active = false;
        };
    }, [selectedChat?.id, setMessages]);

    const handleNewChat = useCallback(async () => {
        try {
            await window.api.chat.createChat({title: "New Chat"});
            setRefreshHistory(true);
        } catch (error) {
            logger.error(error);
            toast.error("Failed to create chat");
        }
    }, []);

    const searchFromChatHistory = useCallback((searchQuery: string) => {
        setSearchHistoryQuery(searchQuery);
        setRefreshHistory(true);
    }, []);

    const handleSelectChat = useCallback(async (chat: Chat) => {
        try {
            await window.api.chat.updateSelectedChat(chat.id);
            setSelectedChat(chat);
        } catch (error) {
            logger.error(error);
            toast.error("Failed to select chat");
        }
    }, []);

    const handleDeleteChat = useCallback(async (chat: Chat) => {
        try {
            await window.api.chat.deleteChat(chat.id);
            setRefreshHistory(true);
        } catch (error) {
            logger.error(error);
            toast.error("Failed to delete chat");
        }
    }, []);

    const handlePinChat = useCallback(async (chat: Chat) => {
        try {
            await window.api.chat.updatePinnedStatusForChat(chat.id, !chat.pinned);
            setRefreshHistory(true);
        } catch (error) {
            logger.error(error);
            toast.error("Failed to update chat pin status");
        }
    }, []);

    const handleSearch = useCallback((query: string) => {
        setSearchQuery(query);
        if (!query) {
            setCurrentMatchIndex(0);
            setTotalMatches(0);
        }
    }, []);

    const handleMatchesFound = useCallback((count: number) => {
        setTotalMatches(count);
        if (count > 0) {
            setCurrentMatchIndex(prev => {
                if (prev === 0) return 1;
                if (prev > count) return count;
                return prev;
            });
        } else {
            setCurrentMatchIndex(0);
        }
    }, []);

    const handleNextMatch = useCallback(() => {
        if (totalMatches > 0) {
            setCurrentMatchIndex(prev => (prev < totalMatches ? prev + 1 : 1));
        }
    }, [totalMatches]);

    const handlePrevMatch = useCallback(() => {
        if (totalMatches > 0) {
            setCurrentMatchIndex(prev => (prev > 1 ? prev - 1 : totalMatches));
        }
    }, [totalMatches]);

    const handleClearSearch = useCallback(() => {
        setSearchQuery("");
        setCurrentMatchIndex(0);
        setTotalMatches(0);
    }, []);

    const handleModelChange = useCallback((providerName: string, modelId: string) => {
        if (!selectedChat) return;

        const updatedChat = {
            ...selectedChat,
            selectedProvider: providerName,
            selectedModelId: modelId
        };

        setSelectedChat(updatedChat);

        // update local chat history state
        setChatHistory(prev =>
            prev.map(chat => (chat.id === selectedChat.id ? updatedChat : chat))
        );

        window.api.chat
            .updateSelectedModelForChat(selectedChat.id, {
                selectedProvider: providerName,
                selectedModelId: modelId,
            })
            .catch((error) => {
                logger.error(error);
                setRefreshHistory(true);
            });
    }, [selectedChat]);

    const handlePersonaChange = useCallback((personaId: string | null) => {
        if (!selectedChat) return;

        const updatedChat = {
            ...selectedChat,
            selectedPersonaId: personaId
        };

        setSelectedChat(updatedChat);

        setChatHistory(prev =>
            prev.map(chat => (chat.id === selectedChat.id ? updatedChat : chat))
        );

        window.api.chat
            .updateSelectedPersonaForChat(selectedChat.id, {
                selectedPersonaId: personaId,
            })
            .catch((error) => {
                logger.error(error);
                setRefreshHistory(true);
            });
    }, [selectedChat]);

    return (
        <div
            className="flex-1 min-h-0 flex rounded-b-lg border-t-0 overflow-hidden bg-background">
            <ChatHistory
                chats={chatHistory}
                selectedChat={selectedChat}
                onChangeSelectedChat={handleSelectChat}
                onNewChat={handleNewChat}
                onSearch={searchFromChatHistory}
            ></ChatHistory>
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                {
                    selectedChat !== null ? (
                        <>
                            <div className="flex items-center h-16 px-4 border-b bg-background shrink-0">
                                <div className="flex-1">
                                    <ChatHeader
                                        chat={selectedChat}
                                        onDeleteChat={handleDeleteChat}
                                        onPinChat={handlePinChat}
                                        onSearch={handleSearch}
                                        currentMatch={currentMatchIndex}
                                        totalMatches={totalMatches}
                                        onNextMatch={handleNextMatch}
                                        onPrevMatch={handlePrevMatch}
                                        onClearSearch={handleClearSearch}
                                    />
                                </div>
                            </div>
                            <div className="flex-1 min-h-0">
                                <Messages
                                    chatId={selectedChat.id}
                                    status={status}
                                    messages={messages}
                                    regenerate={regenerate}
                                    searchQuery={searchQuery}
                                    currentMatchIndex={currentMatchIndex}
                                    onMatchesFound={handleMatchesFound}
                                    addToolApprovalResponse={addToolApprovalResponse}
                                />
                            </div>
                            <div className="p-4 bg-background shrink-0 max-w-3xl mx-auto w-full border-t">
                                <MultimodalInput
                                    chat={selectedChat}
                                    status={status}
                                    messages={messages}
                                    sendMessage={sendMessage}
                                    onModelChange={handleModelChange}
                                    onPersonaChange={handlePersonaChange}
                                    stop={stop}
                                />
                            </div>
                        </>) : (
                        <div className="h-full flex flex-col items-center justify-center">
                            <Empty>
                                <EmptyHeader>
                                    <EmptyMedia variant="icon">
                                        <MessageCirclePlus />
                                    </EmptyMedia>
                                    <EmptyTitle>Start a new Chat</EmptyTitle>
                                    <EmptyDescription>
                                        Click on the button below to Start a new Chat
                                    </EmptyDescription>
                                </EmptyHeader>
                                <EmptyContent>
                                    <Button variant="outline" size="sm" onClick={handleNewChat}>
                                        New Chat
                                    </Button>
                                </EmptyContent>
                            </Empty>
                        </div>
                    )
                }
            </div>
        </div>
    );
}
