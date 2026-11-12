'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import type { TaskComment } from 'core/dto';
import { AlertCircle, Bot, MessageSquare, Send, User } from 'lucide-react';
import React, { useState } from 'react';

interface TaskCommentsProps {
    comments: TaskComment[];
    onAddComment: (content: string) => Promise<void>;
    isPosting?: boolean;
    disabled?: boolean;
}

export function TaskComments({ comments, onAddComment, isPosting = false, disabled = false }: TaskCommentsProps) {
    const [content, setContent] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() || isPosting || disabled) {
            return;
        }
        await onAddComment(content.trim());
        setContent('');
    };

    return (
        <div className="flex flex-col h-full border-t border-border pt-4 space-y-3">
            <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <MessageSquare className="size-3.5" />
                    <span>Audit Trail & Execution Notes ({comments.length})</span>
                </h4>
            </div>

            {/* Scrollable comments stream */}
            <ScrollArea className="max-h-80 min-h-36 pr-3">
                <div className="space-y-3">
                    {comments.length === 0 ? (
                        <div className="py-6 text-center text-xs text-muted-foreground">
                            No comments or execution records yet.
                        </div>
                    ) : (
                        comments.map((comment) => {
                            const dateStr = new Date(comment.createdAt).toLocaleString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                            });

                            if (comment.authorType === 'agent') {
                                return (
                                    <Card
                                        key={comment.id}
                                        className="p-3.5 border-primary/20 bg-primary/5 rounded-lg text-xs space-y-1.5"
                                    >
                                        <div className="flex items-center justify-between text-muted-foreground">
                                            <span className="flex items-center gap-1.5 font-medium text-primary">
                                                <Bot className="size-3.5" />
                                                <span>{comment.authorLabel}</span>
                                                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.2 rounded font-mono">
                                                    Agent Report
                                                </span>
                                            </span>
                                            <span className="text-[11px]">{dateStr}</span>
                                        </div>
                                        <div className="text-foreground whitespace-pre-wrap font-sans text-xs leading-relaxed">
                                            {comment.content}
                                        </div>
                                    </Card>
                                );
                            }

                            if (comment.authorType === 'system') {
                                return (
                                    <div
                                        key={comment.id}
                                        className="p-2.5 rounded-md bg-muted/60 border border-border/70 text-xs text-muted-foreground flex items-start gap-2"
                                    >
                                        <AlertCircle className="size-3.5 text-muted-foreground mt-0.5 shrink-0" />
                                        <div className="flex-1 space-y-0.5">
                                            <div className="flex items-center justify-between text-[11px]">
                                                <span className="font-medium text-foreground">
                                                    {comment.authorLabel}
                                                </span>
                                                <span>{dateStr}</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground">{comment.content}</p>
                                        </div>
                                    </div>
                                );
                            }

                            // Human comment
                            return (
                                <Card
                                    key={comment.id}
                                    className="p-3 border-border bg-card rounded-lg text-xs space-y-1"
                                >
                                    <div className="flex items-center justify-between text-muted-foreground">
                                        <span className="flex items-center gap-1.5 font-medium text-foreground">
                                            <User className="size-3.5 text-muted-foreground" />
                                            <span>{comment.authorLabel}</span>
                                        </span>
                                        <span className="text-[11px]">{dateStr}</span>
                                    </div>
                                    <p className="text-foreground whitespace-pre-wrap text-xs leading-relaxed">
                                        {comment.content}
                                    </p>
                                </Card>
                            );
                        })
                    )}
                </div>
            </ScrollArea>

            {/* Comment Composer */}
            <form onSubmit={handleSubmit} className="space-y-2 pt-2">
                <Textarea
                    placeholder="Add human instruction or feedback (secrets are scrubbed automatically)..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    disabled={disabled || isPosting}
                    className="min-h-16 text-xs resize-none bg-background"
                />
                <div className="flex justify-end">
                    <Button
                        type="submit"
                        size="sm"
                        disabled={!content.trim() || isPosting || disabled}
                        className="gap-1.5 text-xs h-8"
                    >
                        <Send className="size-3" />
                        <span>{isPosting ? 'Posting...' : 'Post Comment'}</span>
                    </Button>
                </div>
            </form>
        </div>
    );
}
