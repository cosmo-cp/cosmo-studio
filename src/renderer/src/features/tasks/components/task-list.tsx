'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TaskStatusBadge } from '@/features/tasks/components/task-status-badge';
import type { TaskStatusFilter } from '@/features/tasks/use-task-page-state';
import type { Task } from 'core/dto';
import { Bot, Cpu, FolderGit2, Link2, Plus, Search } from 'lucide-react';
import React from 'react';

interface TaskListProps {
    tasks: Task[];
    selectedTaskId: string | null;
    isExpanded?: boolean;
    searchQuery: string;
    statusFilter: TaskStatusFilter;
    onSearchChange: (query: string) => void;
    onStatusFilterChange: (filter: TaskStatusFilter) => void;
    onSelectTask: (taskId: string) => void;
    onOpenCreateDialog: () => void;
}

const filterOptions: { label: string; value: TaskStatusFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'Done', value: 'done' },
    { label: 'Failed', value: 'failed' },
    { label: 'Closed', value: 'closed' },
];

export function TaskList({
    tasks,
    selectedTaskId,
    isExpanded = false,
    searchQuery,
    statusFilter,
    onSearchChange,
    onStatusFilterChange,
    onSelectTask,
    onOpenCreateDialog,
}: TaskListProps) {
    return (
        <div
            className={`flex flex-col h-full bg-card/40 ${
                isExpanded ? 'flex-1 min-w-0' : 'border-r border-border w-80 md:w-96 shrink-0'
            }`}
        >
            {/* Header & New Task button */}
            <div className="p-4 border-b border-border flex items-center justify-between gap-2">
                <div>
                    <h2 className="text-lg font-semibold tracking-tight">Tasks</h2>
                    <p className="text-xs text-muted-foreground">Autonomous project tasks</p>
                </div>
                <Button size="sm" onClick={onOpenCreateDialog} className="gap-1.5" data-testid="create-task-btn">
                    <Plus className="size-4" />
                    <span>New Task</span>
                </Button>
            </div>

            {/* Search Input */}
            <div className="p-3 border-b border-border/60">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground pointer-events-none" />
                    <Input
                        type="text"
                        placeholder="Search tasks or workspace..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="pl-8 text-xs h-9 bg-background"
                        data-testid="task-search-input"
                    />
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1 mt-2.5 overflow-x-auto pb-1 scrollbar-none">
                    {filterOptions.map((opt) => {
                        const isActive = statusFilter === opt.value;
                        return (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => onStatusFilterChange(opt.value)}
                                className={`text-xs px-2.5 py-1 rounded-full border transition-colors whitespace-nowrap cursor-pointer ${
                                    isActive
                                        ? 'bg-primary text-primary-foreground border-primary font-medium'
                                        : 'bg-background hover:bg-muted text-muted-foreground border-border'
                                }`}
                                data-testid={`filter-${opt.value}`}
                            >
                                {opt.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Tasks Scrollable List */}
            <ScrollArea className="flex-1">
                <div className="p-3 space-y-2">
                    {tasks.length === 0 ? (
                        <div className="py-12 text-center text-muted-foreground text-xs">
                            No tasks found matching your criteria.
                        </div>
                    ) : (
                        tasks.map((task) => {
                            const isSelected = task.id === selectedTaskId;
                            return (
                                <Card
                                    key={task.id}
                                    onClick={() => onSelectTask(task.id)}
                                    data-testid={`task-item-${task.id}`}
                                    className={`p-3.5 cursor-pointer transition-all border text-left rounded-lg ${
                                        isSelected
                                            ? 'border-primary/80 bg-accent/60 shadow-xs ring-1 ring-primary/40'
                                            : 'border-border/70 hover:border-border hover:bg-accent/20 bg-background'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-2 mb-1.5">
                                        <h3 className="text-sm font-medium line-clamp-1 text-foreground">
                                            {task.title}
                                        </h3>
                                        <TaskStatusBadge status={task.status} />
                                    </div>

                                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2.5">
                                        {task.description}
                                    </p>

                                    <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/50 pt-2 gap-2">
                                        <div
                                            className="flex items-center gap-1.5 truncate max-w-[170px]"
                                            title={task.workspacePath}
                                        >
                                            <FolderGit2 className="size-3 shrink-0" />
                                            <span className="truncate">
                                                {task.workspacePath.split('/').filter(Boolean).pop() ||
                                                    task.workspacePath}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            {task.runtime === 'agent' ? (
                                                <span className="flex items-center gap-1 text-[10px] bg-secondary px-1.5 py-0.5 rounded text-secondary-foreground font-mono">
                                                    <Bot className="size-3" />
                                                    Agent
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-[10px] bg-secondary px-1.5 py-0.5 rounded text-secondary-foreground font-mono">
                                                    <Cpu className="size-3" />
                                                    {task.modelId ? task.modelId.split('/').pop() : 'Model'}
                                                </span>
                                            )}

                                            {task.nextTaskId && (
                                                <span title="Linked to follow-up task">
                                                    <Link2 className="size-3 text-primary" />
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            );
                        })
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
