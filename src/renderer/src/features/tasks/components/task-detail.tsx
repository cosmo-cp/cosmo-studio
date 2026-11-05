'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TaskComments } from '@/features/tasks/components/task-comments';
import { TaskLinkCard } from '@/features/tasks/components/task-link-card';
import { TaskStatusBadge } from '@/features/tasks/components/task-status-badge';
import type { Task, TaskComment, TaskWithLinks } from 'core/dto';
import { Archive, Bot, ChevronDown, Clock, Cpu, FolderGit2, Play, SquareCheck, StopCircle } from 'lucide-react';
import React from 'react';

interface TaskDetailProps {
    task: TaskWithLinks | undefined;
    comments: TaskComment[];
    onExecute: () => Promise<void>;
    onCancel: () => Promise<void>;
    onClose: () => Promise<void>;
    onOverrideStatus: (status: Task['status']) => Promise<void>;
    onSelectTask: (taskId: string) => void;
    onOpenLinkDialog: () => void;
    onUnlinkTask: () => Promise<void>;
    onAddComment: (content: string) => Promise<void>;
    isExecuting?: boolean;
    isCancelling?: boolean;
    isClosing?: boolean;
    isUnlinking?: boolean;
    isPostingComment?: boolean;
}

const statusOptions: Array<{ label: string; value: Task['status'] }> = [
    { label: 'Not Started', value: 'not_started' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Done', value: 'done' },
    { label: 'Failed', value: 'failed' },
    { label: 'Cancelled', value: 'cancelled' },
    { label: 'Closed', value: 'closed' },
];

export function TaskDetail({
    task,
    comments,
    onExecute,
    onCancel,
    onClose,
    onOverrideStatus,
    onSelectTask,
    onOpenLinkDialog,
    onUnlinkTask,
    onAddComment,
    isExecuting = false,
    isCancelling = false,
    isClosing = false,
    isUnlinking = false,
    isPostingComment = false,
}: TaskDetailProps) {
    if (!task) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-background">
                <SquareCheck className="size-12 text-muted-foreground/40 mb-3" />
                <h3 className="text-base font-medium text-foreground">No Task Selected</h3>
                <p className="text-xs text-muted-foreground max-w-sm mt-1">
                    Select a task from the list or create a new task to view instructions and execution status.
                </p>
            </div>
        );
    }

    const isRunning = task.status === 'in_progress';

    // Format timestamps
    const createdAtStr = task.createdAt ? new Date(task.createdAt).toLocaleString() : null;
    const updatedAtStr = task.updatedAt ? new Date(task.updatedAt).toLocaleString() : null;

    return (
        <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
            {/* Top Action Bar */}
            <div className="p-4 border-b border-border flex items-center justify-between gap-3 bg-card/20 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                    <h2 className="text-lg font-semibold truncate text-foreground">{task.title}</h2>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                disabled={isRunning}
                                className="cursor-pointer focus:outline-none flex items-center gap-1 group"
                                title="Change status override"
                            >
                                <TaskStatusBadge status={task.status} />
                                {!isRunning && (
                                    <ChevronDown className="size-3 text-muted-foreground opacity-60 group-hover:opacity-100" />
                                )}
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                            {statusOptions.map((opt) => (
                                <DropdownMenuItem
                                    key={opt.value}
                                    onClick={() => onOverrideStatus(opt.value)}
                                    className="text-xs"
                                >
                                    <TaskStatusBadge status={opt.value} className="mr-2" />
                                    <span>{opt.label}</span>
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Primary Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                    {isRunning ? (
                        <Button
                            size="sm"
                            variant="destructive"
                            onClick={onCancel}
                            disabled={isCancelling}
                            className="text-xs h-8 gap-1.5"
                            data-testid="cancel-task-btn"
                        >
                            <StopCircle className="size-3.5" />
                            <span>{isCancelling ? 'Cancelling...' : 'Cancel Run'}</span>
                        </Button>
                    ) : (
                        <Button
                            size="sm"
                            onClick={onExecute}
                            disabled={isExecuting || task.status === 'closed'}
                            className="text-xs h-8 gap-1.5"
                            data-testid="execute-task-btn"
                        >
                            <Play className="size-3.5 fill-current" />
                            <span>{isExecuting ? 'Starting...' : 'Run Task'}</span>
                        </Button>
                    )}

                    {task.status !== 'closed' && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={onClose}
                            disabled={isRunning || isClosing}
                            className="text-xs h-8 gap-1.5 text-muted-foreground hover:text-foreground"
                            title="Soft-close task"
                        >
                            <Archive className="size-3.5" />
                            <span>Close</span>
                        </Button>
                    )}
                </div>
            </div>

            {/* Scrollable Main Content */}
            <ScrollArea className="flex-1 p-6">
                <div className="max-w-3xl space-y-6">
                    {/* Metadata Strip */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3.5 rounded-lg border border-border bg-card/40 text-xs">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <FolderGit2 className="size-4 shrink-0 text-primary" />
                            <span className="font-medium text-foreground">Workspace:</span>
                            <span className="font-mono truncate" title={task.workspacePath}>
                                {task.workspacePath}
                            </span>
                        </div>

                        <div className="flex items-center gap-2 text-muted-foreground">
                            {task.runtime === 'agent' ? (
                                <>
                                    <Bot className="size-4 shrink-0 text-primary" />
                                    <span className="font-medium text-foreground">ACP Agent:</span>
                                    <span className="font-mono truncate">{task.agentId || 'Default Agent'}</span>
                                </>
                            ) : (
                                <>
                                    <Cpu className="size-4 shrink-0 text-primary" />
                                    <span className="font-medium text-foreground">Model:</span>
                                    <span className="font-mono truncate">
                                        {task.provider ? `${task.provider} / ` : ''}
                                        {task.modelId || 'Default Model'}
                                    </span>
                                </>
                            )}
                        </div>

                        {createdAtStr && (
                            <div className="flex items-center gap-2 text-muted-foreground col-span-full">
                                <Clock className="size-4 shrink-0" />
                                <span>Created {createdAtStr}</span>
                                {updatedAtStr && <span>• Updated {updatedAtStr}</span>}
                            </div>
                        )}
                    </div>

                    {/* Task Description & Acceptance Criteria */}
                    <Card className="p-4 border-border bg-card/60 rounded-lg space-y-2">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Instructions & Acceptance Criteria
                        </h4>
                        <div className="text-xs text-foreground leading-relaxed whitespace-pre-wrap font-sans">
                            {task.description}
                        </div>
                    </Card>

                    {/* Pipeline Execution Linking Slot */}
                    <TaskLinkCard
                        task={task}
                        onSelectTask={onSelectTask}
                        onOpenLinkDialog={onOpenLinkDialog}
                        onUnlinkTask={onUnlinkTask}
                        isUnlinking={isUnlinking}
                    />

                    {/* Comments & Audit Trail */}
                    <TaskComments
                        comments={comments}
                        onAddComment={onAddComment}
                        isPosting={isPostingComment}
                        disabled={isRunning}
                    />
                </div>
            </ScrollArea>
        </div>
    );
}
