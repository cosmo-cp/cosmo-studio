'use client';

import { cn } from '@/lib/utils';
import type { KeyboardEvent, ReactNode } from 'react';

interface HistoryPanelItemProps {
    children: ReactNode;
    className?: string;
    selected?: boolean;
    onSelect: () => void;
}

// Centralize keyboard and selected-state behavior so every history row behaves the same way.
export function HistoryPanelItem({ children, className, selected = false, onSelect }: HistoryPanelItemProps) {
    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key !== 'Enter' && event.key !== ' ') {
            return;
        }

        event.preventDefault();
        onSelect();
    };

    return (
        <div
            className={cn(
                'group rounded-lg p-2.5 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer select-none',
                selected
                    ? 'bg-blue-100/70 text-blue-900 dark:bg-sky-950/40 dark:text-sky-100 font-medium'
                    : 'text-foreground',
                className,
            )}
            data-active={selected}
            onClick={onSelect}
            onKeyDown={handleKeyDown}
            role="button"
            tabIndex={0}
        >
            {children}
        </div>
    );
}
