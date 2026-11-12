'use client';

import { useGetAcpAgentsQuery } from '@/features/acp-agents/acp-agents-api';
import { useGetProvidersQuery } from '@/features/providers/providers-api';
import {
    useCancelTaskMutation,
    useCloseTaskMutation,
    useCreateTaskCommentMutation,
    useCreateTaskMutation,
    useExecuteTaskMutation,
    useGetTaskCommentsQuery,
    useGetTaskQuery,
    useGetTasksQuery,
    useLinkTasksMutation,
    useOverrideTaskStatusMutation,
    useUnlinkTaskMutation,
    useUpdateTaskMutation,
} from '@/features/tasks/tasks-api';
import type { Task, TaskCreateInput, TaskUpdateInput } from 'core/dto';
import { useMemo, useState } from 'react';

export type TaskStatusFilter = 'all' | 'active' | 'done' | 'failed' | 'closed';

export function useTaskPageState() {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>('all');
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);

    // Queries
    const { data: allTasks = [], isLoading: isTasksLoading } = useGetTasksQuery({
        includeClosed: true,
    });
    const { data: selectedTask, isLoading: isTaskLoading } = useGetTaskQuery(selectedTaskId);
    const { data: comments = [], isLoading: isCommentsLoading } = useGetTaskCommentsQuery(selectedTaskId);
    const { data: providers = [] } = useGetProvidersQuery();
    const { data: agents = [] } = useGetAcpAgentsQuery();

    // Mutations
    const [createTaskMutation, { isLoading: isCreating }] = useCreateTaskMutation();
    const [updateTaskMutation, { isLoading: isUpdating }] = useUpdateTaskMutation();
    const [closeTaskMutation, { isLoading: isClosing }] = useCloseTaskMutation();
    const [overrideStatusMutation, { isLoading: isOverriding }] = useOverrideTaskStatusMutation();
    const [linkTasksMutation, { isLoading: isLinking }] = useLinkTasksMutation();
    const [unlinkTaskMutation, { isLoading: isUnlinking }] = useUnlinkTaskMutation();
    const [executeTaskMutation, { isLoading: isExecuting }] = useExecuteTaskMutation();
    const [cancelTaskMutation, { isLoading: isCancelling }] = useCancelTaskMutation();
    const [createCommentMutation, { isLoading: isPostingComment }] = useCreateTaskCommentMutation();

    // Filtering
    const filteredTasks = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return allTasks.filter((task) => {
            if (statusFilter === 'active' && !['not_started', 'in_progress'].includes(task.status)) {
                return false;
            }
            if (statusFilter === 'done' && task.status !== 'done') {
                return false;
            }
            if (statusFilter === 'failed' && !['failed', 'cancelled'].includes(task.status)) {
                return false;
            }
            if (statusFilter === 'closed' && task.status !== 'closed') {
                return false;
            }
            if (statusFilter === 'all' && task.status === 'closed') {
                // By default 'all' shows active, done, failed, cancelled, but not soft-closed unless explicitly selected
                return false;
            }

            if (query.length > 0) {
                const matchTitle = task.title.toLowerCase().includes(query);
                const matchDesc = task.description.toLowerCase().includes(query);
                const matchWorkspace = task.workspacePath.toLowerCase().includes(query);
                return matchTitle || matchDesc || matchWorkspace;
            }

            return true;
        });
    }, [allTasks, searchQuery, statusFilter]);

    // Keep task preview hidden until the user selects a task.
    const effectiveSelectedTaskId = useMemo(() => {
        if (selectedTaskId && allTasks.some((t) => t.id === selectedTaskId)) {
            return selectedTaskId;
        }
        return null;
    }, [selectedTaskId, allTasks]);

    // Available tasks for linking (cannot link to self, closed tasks, or tasks already linked to another predecessor)
    const linkCandidates = useMemo(() => {
        if (!effectiveSelectedTaskId) {
            return [];
        }
        const alreadyLinkedTargetIds = new Set(
            allTasks
                .filter((t) => t.id !== effectiveSelectedTaskId && Boolean(t.nextTaskId))
                .map((t) => t.nextTaskId as string),
        );

        return allTasks.filter((t) => {
            return t.id !== effectiveSelectedTaskId && t.status !== 'closed' && !alreadyLinkedTargetIds.has(t.id);
        });
    }, [allTasks, effectiveSelectedTaskId]);

    const handleCreateTask = async (input: TaskCreateInput) => {
        const result = await createTaskMutation(input);
        if ('data' in result && result.data) {
            setSelectedTaskId(result.data.id);
            setIsCreateDialogOpen(false);
        }
    };

    const handleUpdateTask = async (updates: TaskUpdateInput) => {
        if (!effectiveSelectedTaskId) {
            return;
        }
        const result = await updateTaskMutation({ id: effectiveSelectedTaskId, updates });
        if ('data' in result) {
            setIsEditDialogOpen(false);
        }
    };

    const handleCloseTask = async () => {
        if (!effectiveSelectedTaskId) {
            return;
        }
        await closeTaskMutation(effectiveSelectedTaskId);
    };

    const handleOverrideStatus = async (status: Task['status']) => {
        if (!effectiveSelectedTaskId) {
            return;
        }
        await overrideStatusMutation({ id: effectiveSelectedTaskId, status });
    };

    const handleLinkTask = async (targetTaskId: string) => {
        if (!effectiveSelectedTaskId) {
            return;
        }
        const result = await linkTasksMutation({
            sourceTaskId: effectiveSelectedTaskId,
            targetTaskId,
        });
        if ('data' in result) {
            setIsLinkDialogOpen(false);
        }
    };

    const handleUnlinkTask = async () => {
        if (!effectiveSelectedTaskId) {
            return;
        }
        await unlinkTaskMutation(effectiveSelectedTaskId);
    };

    const handleExecuteTask = async () => {
        if (!effectiveSelectedTaskId) {
            return;
        }
        await executeTaskMutation(effectiveSelectedTaskId);
    };

    const handleCancelTask = async () => {
        if (!effectiveSelectedTaskId) {
            return;
        }
        await cancelTaskMutation(effectiveSelectedTaskId);
    };

    const handleAddComment = async (content: string) => {
        if (!effectiveSelectedTaskId || !content.trim()) {
            return;
        }
        await createCommentMutation({
            taskId: effectiveSelectedTaskId,
            input: {
                authorType: 'human',
                authorLabel: 'User',
                content: content.trim(),
            },
        });
    };

    return {
        // Data
        tasks: filteredTasks,
        allTasks,
        selectedTask,
        selectedTaskId: effectiveSelectedTaskId,
        comments,
        providers,
        agents,
        linkCandidates,

        // Loading states
        isTasksLoading,
        isTaskLoading,
        isCommentsLoading,
        isCreating,
        isUpdating,
        isClosing,
        isOverriding,
        isLinking,
        isUnlinking,
        isExecuting,
        isCancelling,
        isPostingComment,

        // Search & Filter
        searchQuery,
        setSearchQuery,
        statusFilter,
        setStatusFilter,
        setSelectedTaskId,

        // Dialog controls
        isCreateDialogOpen,
        setIsCreateDialogOpen,
        isEditDialogOpen,
        setIsEditDialogOpen,
        isLinkDialogOpen,
        setIsLinkDialogOpen,

        // Handlers
        handleCreateTask,
        handleUpdateTask,
        handleCloseTask,
        handleOverrideStatus,
        handleLinkTask,
        handleUnlinkTask,
        handleExecuteTask,
        handleCancelTask,
        handleAddComment,
    };
}
