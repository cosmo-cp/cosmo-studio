'use client';
import { Button } from '@/components/ui/button';
import type { Chat } from 'core/dto';
import { MessageCirclePlus, Pin, Search } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { format, isThisWeek, isThisYear, isToday, isYesterday } from 'date-fns';

export function ChatHistory({
    chats,
    selectedChat,
    onChangeSelectedChat,
    onNewChat,
    onSearch,
}: {
    chats: Chat[];
    selectedChat: Chat | null;
    onChangeSelectedChat: (chat: Chat) => void;
    onNewChat: () => void;
    onSearch: (query: string) => void;
}) {
    // Enhanced time formatting function
    function formatMessageTime(timestamp: Date | null): string {
        if (!timestamp) {
            return '';
        }
        const date = new Date(timestamp);

        if (isToday(date)) {
            return format(date, 'h:mm a'); // 3:30 PM
        } else if (isYesterday(date)) {
            return 'Yesterday';
        } else if (isThisWeek(date)) {
            return format(date, 'EEEE'); // Day name
        } else if (isThisYear(date)) {
            return format(date, 'MMM d'); // Jan 15
        } else {
            return format(date, 'dd/MM/yy'); // 15/01/24
        }
    }

    return (
        <div className="flex flex-col overflow-hidden">
            <div className="flex items-center justify-between h-16 px-4 border-b border-r flex-shrink-0">
                <h2 className="text-lg font-semibold">Chat</h2>
                <div className="flex items-center gap-1">
                    <TooltipProvider>
                        {/* Search */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="cursor-pointer" onClick={onNewChat}>
                                    <MessageCirclePlus className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>New Chat</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>
            <div className="px-4 py-3 border-b border-r flex-shrink-0">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Search history..."
                        onChange={(e) => onSearch(e.target.value)}
                        className="pl-9 cursor-text"
                    />
                </div>
            </div>
            <ScrollArea className="max-h-[calc(100dvh-200px)] flex-1 border-r">
                <div className="p-2">
                    {chats.map((chat) => (
                        <div
                            key={chat.id}
                            className={cn(
                                'flex items-center gap-3 p-3 rounded-lg cursor-pointer relative overflow-hidden hover:bg-accent/50 transition-colors',
                                selectedChat?.id === chat.id ? 'bg-accent text-accent-foreground' : '',
                            )}
                            onClick={() => onChangeSelectedChat(chat)}
                        >
                            {/* Content */}
                            <div className="flex-1 min-w-0 overflow-hidden">
                                <div className="flex items-center justify-between mb-1 min-w-0">
                                    <div className="flex items-center gap-1 min-w-0 flex-1 overflow-hidden pr-2">
                                        <h3 className="font-medium truncate min-w-0 max-w-[160px] lg:max-w-[180px]">
                                            {chat.title}
                                        </h3>
                                    </div>
                                    <span className="text-xs text-muted-foreground flex-shrink-0 whitespace-nowrap">
                                        {formatMessageTime(chat.lastMessageAt)}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between gap-2 min-w-0">
                                    <p className="text-sm text-muted-foreground truncate flex-1 min-w-0 max-w-[140px] lg:max-w-[170px] pr-2">
                                        {chat.lastMessage}
                                    </p>
                                    {chat.pinned && (
                                        <Pin className="h-3 w-3 text-muted-foreground flex-shrink-0" fill="black" />
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}
