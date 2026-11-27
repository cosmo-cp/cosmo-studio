'use client';

import { HistoryPanelItem } from '@/components/history-panel-item';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface HistoryPreviewItemProps {
    className?: string;
    footerTrailing?: ReactNode;
    headerTrailing?: ReactNode;
    onSelect: () => void;
    selected?: boolean;
    summary: ReactNode;
    title: ReactNode;
}

// Share the standard history row structure so individual history types only provide their custom adornments.
export function HistoryPreviewItem({
    className,
    footerTrailing,
    headerTrailing,
    onSelect,
    selected = false,
    summary,
    title,
}: HistoryPreviewItemProps) {
    return (
        <HistoryPanelItem
            className={cn('flex items-start gap-3 overflow-hidden', className)}
            onSelect={onSelect}
            selected={selected}
        >
            <div className="min-w-0 flex-1 overflow-hidden">
                <div className="mb-1 flex min-w-0 items-center justify-between gap-2">
                    <div className="min-w-0 flex-1 overflow-hidden">{title}</div>
                    {headerTrailing ? (
                        <span className="shrink-0 text-xs whitespace-nowrap text-muted-foreground">
                            {headerTrailing}
                        </span>
                    ) : null}
                </div>
                <div className="flex min-w-0 items-center justify-between gap-2">
                    <div className="min-w-0 flex-1 overflow-hidden">{summary}</div>
                    {footerTrailing}
                </div>
            </div>
        </HistoryPanelItem>
    );
}
