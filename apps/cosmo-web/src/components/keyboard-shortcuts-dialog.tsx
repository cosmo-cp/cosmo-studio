'use client';

import { KeyboardShortcutsList } from '@/components/keyboard-shortcuts-list';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Keyboard } from 'lucide-react';

export interface KeyboardShortcutsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

/**
 * Dialog presenting available keyboard shortcuts for Cosmo Studio.
 */
export function KeyboardShortcutsDialog({ open, onOpenChange }: KeyboardShortcutsDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md rounded-2xl p-6 sm:max-w-lg">
                <DialogHeader className="gap-1.5 pb-2">
                    <div className="flex items-center gap-2">
                        <Keyboard className="size-5 text-primary" />
                        <DialogTitle className="text-lg font-semibold">Keyboard Shortcuts</DialogTitle>
                    </div>
                    <DialogDescription className="text-xs text-muted-foreground">
                        Quick keyboard combinations for navigating and interacting with Cosmo Studio.
                    </DialogDescription>
                </DialogHeader>

                <KeyboardShortcutsList />
            </DialogContent>
        </Dialog>
    );
}
