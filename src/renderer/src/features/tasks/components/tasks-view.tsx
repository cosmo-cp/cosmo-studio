'use client';

import { CreateTaskDialog } from '@/features/tasks/components/create-task-dialog';
import { LinkTaskDialog } from '@/features/tasks/components/link-task-dialog';
import { TaskDetail } from '@/features/tasks/components/task-detail';
import { TaskList } from '@/features/tasks/components/task-list';
import { useTaskPageState } from '@/features/tasks/use-task-page-state';
import React from 'react';

export function TasksView() {
    const {
        tasks,
        selectedTask,
        selectedTaskId,
        comments,
        providers,
        agents,
        linkCandidates,

        isCreating,
        isClosing,
        isLinking,
        isUnlinking,
        isExecuting,
        isCancelling,
        isPostingComment,

        searchQuery,
        setSearchQuery,
        statusFilter,
        setStatusFilter,
        setSelectedTaskId,

        isCreateDialogOpen,
        setIsCreateDialogOpen,
        isLinkDialogOpen,
        setIsLinkDialogOpen,

        handleCreateTask,
        handleCloseTask,
        handleOverrideStatus,
        handleLinkTask,
        handleUnlinkTask,
        handleExecuteTask,
        handleCancelTask,
        handleAddComment,
    } = useTaskPageState();
    const hasSelectedTask = Boolean(selectedTask);

    return (
        <div className="flex flex-1 min-h-0 w-full h-full overflow-hidden bg-background">
            {/* Left Column: Tasks List */}
            <TaskList
                tasks={tasks}
                selectedTaskId={selectedTaskId}
                isExpanded={!hasSelectedTask}
                searchQuery={searchQuery}
                statusFilter={statusFilter}
                onSearchChange={setSearchQuery}
                onStatusFilterChange={setStatusFilter}
                onSelectTask={setSelectedTaskId}
                onOpenCreateDialog={() => setIsCreateDialogOpen(true)}
            />

            {/* Right Column: Selected Task Detail */}
            {hasSelectedTask ? (
                <TaskDetail
                    task={selectedTask}
                    comments={comments}
                    onExecute={handleExecuteTask}
                    onCancel={handleCancelTask}
                    onClose={handleCloseTask}
                    onOverrideStatus={handleOverrideStatus}
                    onSelectTask={setSelectedTaskId}
                    onOpenLinkDialog={() => setIsLinkDialogOpen(true)}
                    onUnlinkTask={handleUnlinkTask}
                    onAddComment={handleAddComment}
                    isExecuting={isExecuting}
                    isCancelling={isCancelling}
                    isClosing={isClosing}
                    isUnlinking={isUnlinking}
                    isPostingComment={isPostingComment}
                />
            ) : null}

            {/* Create Task Dialog */}
            <CreateTaskDialog
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
                onSubmit={handleCreateTask}
                isSubmitting={isCreating}
                providers={providers}
                agents={agents}
            />

            {/* Link Follow-up Task Dialog */}
            <LinkTaskDialog
                open={isLinkDialogOpen}
                onOpenChange={setIsLinkDialogOpen}
                candidates={linkCandidates}
                onLink={handleLinkTask}
                isLinking={isLinking}
            />
        </div>
    );
}
