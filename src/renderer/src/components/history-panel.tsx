'use client';

import { HistoryPreviewItem } from '@/components/history-preview-item';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Search } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Key, ReactNode } from 'react';

interface HistoryPanelAction {
    ariaLabel: string;
    icon: LucideIcon;
    label: string;
    onClick: () => void;
}

interface HistoryPanelPreview {
    className?: string;
    footerTrailing?: ReactNode;
    headerTrailing?: ReactNode;
    onSelect: () => void;
    selected?: boolean;
    summary: ReactNode;
    title: ReactNode;
}

interface HistoryPanelProps<TItem> {
    action: HistoryPanelAction;
    className?: string;
    emptyState?: ReactNode;
    getItemKey: (item: TItem) => Key;
    items: TItem[];
    renderPreview: (item: TItem) => HistoryPanelPreview;
    searchAriaLabel: string;
    searchPlaceholder: string;
    title: string;
    onSearch: (query: string) => void;
}

// Share the common history chrome so chat and workflow panels stay visually aligned.
export function HistoryPanel<TItem>({
    action,
    className,
    emptyState,
    getItemKey,
    items,
    renderPreview,
    searchAriaLabel,
    searchPlaceholder,
    title,
    onSearch,
}: HistoryPanelProps<TItem>) {
    return (
        <TooltipProvider>
            <div className={cn('flex flex-col overflow-hidden', className)}>
                <div className="flex h-16 shrink-0 items-center justify-between border-r border-b px-4">
                    <h2 className="text-lg font-semibold">{title}</h2>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                aria-label={action.ariaLabel}
                                className="cursor-pointer"
                                onClick={action.onClick}
                                size="icon"
                                variant="ghost"
                            >
                                <action.icon className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{action.label}</p>
                        </TooltipContent>
                    </Tooltip>
                </div>
                <div className="shrink-0 border-r border-b px-4 py-3">
                    <div className="relative">
                        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            aria-label={searchAriaLabel}
                            className="cursor-text pl-9"
                            onChange={(event) => onSearch(event.target.value)}
                            placeholder={searchPlaceholder}
                            type="text"
                        />
                    </div>
                </div>
                <ScrollArea className="max-h-[calc(100dvh-200px)] flex-1 border-r">
                    <div className="p-2">
                        {items.length > 0
                            ? items.map((item) => {
                                  const preview = renderPreview(item);

                                  return (
                                      <div key={getItemKey(item)}>
                                          <HistoryPreviewItem
                                              className={preview.className}
                                              footerTrailing={preview.footerTrailing}
                                              headerTrailing={preview.headerTrailing}
                                              onSelect={preview.onSelect}
                                              selected={preview.selected}
                                              summary={preview.summary}
                                              title={preview.title}
                                          />
                                      </div>
                                  );
                              })
                            : emptyState}
                    </div>
                </ScrollArea>
            </div>
        </TooltipProvider>
    );
}
