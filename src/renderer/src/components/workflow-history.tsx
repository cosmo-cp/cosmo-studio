'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { format, isThisWeek, isThisYear, isToday, isYesterday } from 'date-fns';
import { Plus, Search, Trash2 } from 'lucide-react';
import type { KeyboardEvent } from 'react';

export interface WorkflowListItem {
    id: string;
    title: string;
    summary: string;
    updatedAt: Date;
    latestVersion?: number;
}

// Keep workflow timestamps readable in the same compact style as chat history.
function formatWorkflowTime(timestamp: Date): string {
    if (isToday(timestamp)) {
        return format(timestamp, 'h:mm a');
    }
    if (isYesterday(timestamp)) {
        return 'Yesterday';
    }
    if (isThisWeek(timestamp)) {
        return format(timestamp, 'EEEE');
    }
    if (isThisYear(timestamp)) {
        return format(timestamp, 'MMM d');
    }
    return format(timestamp, 'dd/MM/yy');
}

export function WorkflowHistory({
    workflows,
    selectedWorkflowId,
    onCreateWorkflow,
    onDeleteWorkflow,
    onSearch,
    onSelectWorkflow,
}: {
    workflows: WorkflowListItem[];
    selectedWorkflowId: string | null;
    onCreateWorkflow: () => void;
    onDeleteWorkflow: (workflow: WorkflowListItem) => void;
    onSearch: (query: string) => void;
    onSelectWorkflow: (workflowId: string) => void;
}) {
    // Preserve keyboard selection so the history list works without a mouse.
    const handleWorkflowKeyDown = (event: KeyboardEvent<HTMLDivElement>, workflowId: string) => {
        if (event.key !== 'Enter' && event.key !== ' ') {
            return;
        }

        event.preventDefault();
        onSelectWorkflow(workflowId);
    };

    return (
        <div className="flex w-full max-w-xs shrink-0 flex-col overflow-hidden">
            <div className="flex h-16 items-center justify-between border-r border-b px-4 shrink-0">
                <h2 className="text-lg font-semibold">Workflow</h2>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                aria-label="New Workflow"
                                className="cursor-pointer"
                                onClick={onCreateWorkflow}
                                size="icon"
                                variant="ghost"
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>New Workflow</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
            <div className="border-r border-b px-4 py-3 shrink-0">
                <div className="relative">
                    <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        className="cursor-text pl-9"
                        onChange={(event) => onSearch(event.target.value)}
                        placeholder="Search workflows..."
                        type="text"
                    />
                </div>
            </div>
            <ScrollArea className="max-h-[calc(100dvh-200px)] flex-1 border-r">
                <div className="p-2">
                    {workflows.length > 0 ? (
                        <TooltipProvider>
                            {workflows.map((workflow) => (
                                <div
                                    className={cn(
                                        'group flex cursor-pointer items-start gap-3 rounded-lg p-3 transition-colors hover:bg-accent/50',
                                        selectedWorkflowId === workflow.id ? 'bg-accent text-accent-foreground' : '',
                                    )}
                                    data-active={selectedWorkflowId === workflow.id}
                                    key={workflow.id}
                                    onClick={() => onSelectWorkflow(workflow.id)}
                                    onKeyDown={(event) => handleWorkflowKeyDown(event, workflow.id)}
                                    role="button"
                                    tabIndex={0}
                                >
                                    <div className="min-w-0 flex-1 overflow-hidden">
                                        <div className="mb-1 flex min-w-0 items-center justify-between gap-2">
                                            <h3 className="truncate font-medium">{workflow.title}</h3>
                                            <span className="text-xs whitespace-nowrap text-muted-foreground">
                                                {formatWorkflowTime(workflow.updatedAt)}
                                            </span>
                                        </div>
                                        <p className="truncate pr-2 text-sm text-muted-foreground">
                                            {workflow.summary}
                                        </p>
                                    </div>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                aria-label={`Delete ${workflow.title}`}
                                                className="h-8 w-8 shrink-0 cursor-pointer"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    onDeleteWorkflow(workflow);
                                                }}
                                                size="icon"
                                                variant="ghost"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Delete Workflow</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                            ))}
                        </TooltipProvider>
                    ) : (
                        <div className="p-4 text-sm text-muted-foreground">No workflows yet.</div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
