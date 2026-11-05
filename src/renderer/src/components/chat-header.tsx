'use client';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useUpdateChatMutation } from '@/features/chat/chat-api';
import type { Chat } from 'core/dto';
import {
    Check,
    ChevronDown,
    ChevronUp,
    MoreVertical,
    Pin,
    PinOff,
    Search,
    Share2,
    SquarePen,
    Trash,
    X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

export function ChatHeader({
    chat,
    onDeleteChat,
    onPinChat,
    onSearch,
    currentMatch,
    totalMatches,
    onNextMatch,
    onPrevMatch,
    onClearSearch,
}: {
    chat: Chat;
    onDeleteChat: (chat: Chat) => void;
    onPinChat: (chat: Chat) => void;
    onSearch: (query: string) => void;
    currentMatch: number;
    totalMatches: number;
    onNextMatch: () => void;
    onPrevMatch: () => void;
    onClearSearch: () => void;
}) {
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [titleInput, setTitleInput] = useState(chat.title);
    const [updateChat] = useUpdateChatMutation();
    const inputRef = useRef<HTMLInputElement>(null);
    const titleInputRef = useRef<HTMLInputElement>(null);

    const handleStartEditing = () => {
        setTitleInput(chat.title);
        setIsEditingTitle(true);
    };

    useEffect(() => {
        if (isEditingTitle) {
            titleInputRef.current?.focus();
            titleInputRef.current?.select();
        }
    }, [isEditingTitle]);

    // Ctrl+F / Cmd+F to open search
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                setIsSearchOpen(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        if (!isSearchOpen) {
            return;
        }

        const timeoutId = window.setTimeout(() => {
            inputRef.current?.focus();
        }, 0);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [isSearchOpen]);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setSearchQuery(query);
    };

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (isSearchOpen) {
                onSearch(searchQuery);
            }
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [searchQuery, isSearchOpen, onSearch]);

    const handleCloseSearch = () => {
        setSearchQuery('');
        onClearSearch();
        setIsSearchOpen(false);
    };

    const handleDeleteClick = () => {
        setIsDeleteOpen(true);
    };

    const handleConfirmDelete = () => {
        onDeleteChat(chat);
        setIsDeleteOpen(false);
    };

    const handlePinChat = () => {
        onPinChat(chat);
    };

    const handleSaveTitle = async () => {
        const trimmed = titleInput.trim();
        if (trimmed && trimmed !== chat.title) {
            await updateChat({ chatId: chat.id, updates: { title: trimmed } });
        }
        setIsEditingTitle(false);
    };

    const handleCancelTitle = () => {
        setTitleInput(chat.title);
        setIsEditingTitle(false);
    };

    const handleShare = () => {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(window.location.href);
            toast.success('Conversation link copied to clipboard');
        }
    };

    return (
        <div className="flex items-center justify-between h-full flex-row w-full gap-4">
            {/* Left side: Chat title & edit */}
            <div className="flex items-center gap-2 min-w-0 max-w-[60%]">
                {isEditingTitle ? (
                    <div className="flex items-center gap-1.5">
                        <Input
                            ref={titleInputRef}
                            value={titleInput}
                            onChange={(e) => setTitleInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveTitle();
                                if (e.key === 'Escape') handleCancelTitle();
                            }}
                            className="h-8 text-sm font-semibold max-w-xs"
                        />
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-emerald-600 hover:text-emerald-700"
                            onClick={handleSaveTitle}
                            aria-label="Save title"
                        >
                            <Check className="h-4 w-4" />
                        </Button>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={handleCancelTitle}
                            aria-label="Cancel editing"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                ) : (
                    <div className="flex items-center gap-1.5 min-w-0">
                        <h1 className="text-base font-semibold truncate text-foreground">{chat.title}</h1>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                                        onClick={handleStartEditing}
                                        aria-label="Rename conversation"
                                    >
                                        <SquarePen className="h-3.5 w-3.5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Rename conversation</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                )}
            </div>

            {/* Right side - Search bar or actions */}
            {isSearchOpen ? (
                <div className="flex items-center gap-2 flex-1 max-w-md ml-auto animate-in fade-in slide-in-from-right-5 duration-200">
                    <div className="relative flex-1 flex items-center gap-2">
                        <Input
                            ref={inputRef}
                            placeholder="Search in conversation..."
                            value={searchQuery}
                            onChange={handleSearchChange}
                            className="h-8 pr-20"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    if (e.shiftKey) {
                                        onPrevMatch();
                                    } else {
                                        onNextMatch();
                                    }
                                } else if (e.key === 'Escape') {
                                    handleCloseSearch();
                                }
                            }}
                        />
                        <div className="absolute right-2 flex items-center gap-1 text-xs text-muted-foreground">
                            {totalMatches > 0 && (
                                <span>
                                    {currentMatch} of {totalMatches}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={onPrevMatch}
                            disabled={totalMatches === 0}
                        >
                            <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={onNextMatch}
                            disabled={totalMatches === 0}
                        >
                            <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCloseSearch}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-1 ml-auto">
                    <TooltipProvider>
                        {/* Share */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                                    onClick={handleShare}
                                    aria-label="Share conversation"
                                >
                                    <Share2 className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Share conversation</p>
                            </TooltipContent>
                        </Tooltip>

                        {/* More menu */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                                    aria-label="More options"
                                >
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setIsSearchOpen(true)}>
                                    <Search className="mr-2 h-4 w-4" />
                                    <span>Search in conversation</span>
                                    <span className="ml-auto text-xs text-muted-foreground">⌘F</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handlePinChat}>
                                    {chat.pinned ? (
                                        <>
                                            <PinOff className="mr-2 h-4 w-4" />
                                            <span>Unpin conversation</span>
                                        </>
                                    ) : (
                                        <>
                                            <Pin className="mr-2 h-4 w-4" />
                                            <span>Pin conversation</span>
                                        </>
                                    )}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={handleDeleteClick}
                                    className="text-destructive focus:text-destructive"
                                >
                                    <Trash className="mr-2 h-4 w-4" />
                                    <span>Delete conversation</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TooltipProvider>
                </div>
            )}
            <ConfirmDialog
                open={isDeleteOpen}
                onOpenChange={setIsDeleteOpen}
                title="Delete Chat"
                description="Are you sure you want to delete this chat? This action cannot be undone."
                confirmText="Delete"
                variant="destructive"
                onConfirm={handleConfirmDelete}
            />
        </div>
    );
}
