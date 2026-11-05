'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TaskStatusBadge } from '@/features/tasks/components/task-status-badge';
import type { TaskWithLinks } from 'core/dto';
import { ArrowLeft, ArrowRight, Link2, Plus, Unlink } from 'lucide-react';
import React from 'react';

interface TaskLinkCardProps {
    task: TaskWithLinks;
    onSelectTask: (taskId: string) => void;
    onOpenLinkDialog: () => void;
    onUnlinkTask: () => void;
    isUnlinking?: boolean;
}

export function TaskLinkCard({
    task,
    onSelectTask,
    onOpenLinkDialog,
    onUnlinkTask,
    isUnlinking = false,
}: TaskLinkCardProps) {
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Link2 className="size-3.5" />
                    <span>Pipeline Execution Linking (1:1)</span>
                </h4>
            </div>

            {/* Previous Upstream Task notice if present */}
            {task.previousTask && (
                <div className="flex items-center gap-2 text-xs p-2.5 rounded-md bg-muted/40 border border-border/60 text-muted-foreground">
                    <ArrowLeft className="size-3.5 text-muted-foreground shrink-0" />
                    <span>Upstream predecessor:</span>
                    <button
                        type="button"
                        onClick={() => onSelectTask(task.previousTask!.id)}
                        className="font-medium text-foreground hover:underline truncate cursor-pointer text-left"
                    >
                        {task.previousTask.title}
                    </button>
                    <TaskStatusBadge status={task.previousTask.status} className="ml-auto" />
                </div>
            )}

            {/* Downstream Successor Task Slot */}
            {task.nextTask ? (
                <Card className="p-3.5 border-border bg-accent/20 rounded-lg">
                    <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                    <span>Follow-up</span>
                                    <ArrowRight className="size-3" />
                                </span>
                                <TaskStatusBadge status={task.nextTask.status} />
                            </div>
                            <h5
                                onClick={() => onSelectTask(task.nextTask!.id)}
                                className="text-sm font-semibold truncate hover:underline cursor-pointer text-foreground"
                            >
                                {task.nextTask.title}
                            </h5>
                            <p className="text-xs text-muted-foreground line-clamp-1">{task.nextTask.workspacePath}</p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onSelectTask(task.nextTask!.id)}
                                className="text-xs h-8"
                            >
                                View Task
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={onUnlinkTask}
                                disabled={isUnlinking || task.status === 'in_progress'}
                                className="text-xs h-8 text-destructive hover:bg-destructive/10"
                                title="Unlink follow-up task"
                            >
                                <Unlink className="size-3.5" />
                            </Button>
                        </div>
                    </div>
                </Card>
            ) : (
                <div className="flex items-center justify-between p-3.5 rounded-lg border border-dashed border-border bg-background text-xs text-muted-foreground">
                    <span>No follow-up task linked. Next task runs automatically on completion.</span>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={onOpenLinkDialog}
                        disabled={task.status === 'closed' || task.status === 'in_progress'}
                        className="gap-1.5 text-xs h-8"
                    >
                        <Plus className="size-3.5" />
                        <span>Link Next Task</span>
                    </Button>
                </div>
            )}
        </div>
    );
}
