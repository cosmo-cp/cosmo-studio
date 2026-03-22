'use client';

import { Chat } from 'core/dto';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Pin, PinOff, Search, Trash, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Input } from '@/components/ui/input';

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
    const inputRef = useRef<HTMLInputElement>(null);

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

    return (
        <div className="flex items-center justify-end h-full flex-row w-full">
            {isSearchOpen ? (
                <div className="flex items-center gap-2 flex-1 mr-2 animate-in fade-in slide-in-from-right-5 duration-200">
                    <div className="relative flex-1 max-w-md ml-auto flex items-center gap-2">
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
                /* Right side - Action buttons */
                <div className="flex items-center gap-1 ml-auto">
                    <TooltipProvider>
                        {/* Pin */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="cursor-pointer" onClick={handlePinChat}>
                                    {chat.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>{chat.pinned ? <p>Un-Pin Chat</p> : <p>Pin Chat</p>}</TooltipContent>
                        </Tooltip>
                        {/* Search */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="cursor-pointer"
                                    onClick={() => setIsSearchOpen(true)}
                                >
                                    <Search className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Search in conversation</p>
                            </TooltipContent>
                        </Tooltip>

                        {/* Info */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={handleDeleteClick}
                                    className="cursor-pointer"
                                >
                                    <Trash className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Delete</p>
                            </TooltipContent>
                        </Tooltip>
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
