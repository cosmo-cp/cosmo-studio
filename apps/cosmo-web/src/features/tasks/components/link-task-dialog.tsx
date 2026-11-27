'use client';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Task } from 'core/dto';
import { ArrowRight, Link2 } from 'lucide-react';
import React, { useState } from 'react';

interface LinkTaskDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    candidates: Task[];
    onLink: (targetTaskId: string) => Promise<void>;
    isLinking?: boolean;
}

export function LinkTaskDialog({ open, onOpenChange, candidates, onLink, isLinking = false }: LinkTaskDialogProps) {
    const [selectedTargetId, setSelectedTargetId] = useState<string>('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTargetId || isLinking) {
            return;
        }
        await onLink(selectedTargetId);
        setSelectedTargetId('');
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[460px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Link2 className="size-4 text-primary" />
                            <span>Link Follow-up Task</span>
                        </DialogTitle>
                        <DialogDescription>
                            Connect this task sequentially to a downstream task (1:1 pipeline). When this task finishes
                            successfully, the follow-up task will be triggered with the upstream context.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4 space-y-3">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium">Select Downstream Task</label>
                            <Select value={selectedTargetId} onValueChange={setSelectedTargetId}>
                                <SelectTrigger className="w-full text-xs h-9">
                                    <SelectValue placeholder="Choose a task to execute next..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {candidates.length === 0 ? (
                                        <SelectItem value="none" disabled className="text-xs">
                                            No eligible candidate tasks found
                                        </SelectItem>
                                    ) : (
                                        candidates.map((t) => (
                                            <SelectItem key={t.id} value={t.id} className="text-xs">
                                                <div className="flex items-center justify-between gap-2 w-full">
                                                    <span className="truncate max-w-[240px]">{t.title}</span>
                                                    <span className="text-[10px] text-muted-foreground uppercase">
                                                        {t.status}
                                                    </span>
                                                </div>
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="text-xs h-8"
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={!selectedTargetId || isLinking} className="text-xs h-8 gap-1.5">
                            <ArrowRight className="size-3.5" />
                            <span>{isLinking ? 'Linking...' : 'Connect Link'}</span>
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
