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
                'group rounded-lg p-3 transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                selected && 'bg-accent text-accent-foreground',
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
