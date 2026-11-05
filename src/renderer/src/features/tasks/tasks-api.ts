import type { BackendCacheHelpers } from '@/lib/store/backend-hooks';
import { useBackendMutation, useBackendQuery } from '@/lib/store/backend-hooks';
import type { Task, TaskCommentInput, TaskCreateInput, TaskListFilter, TaskUpdateInput } from 'core/dto';

export const taskKeys = {
    all: ['tasks'] as const,
    list: (filter?: TaskListFilter) => ['tasks', 'list', filter ?? null] as const,
    detail: (id: string | null) => ['tasks', 'detail', id] as const,
    comments: (taskId: string | null) => ['tasks', 'comments', taskId] as const,
};

async function revalidateTaskData(revalidateMatching: BackendCacheHelpers['revalidateMatching']) {
    await revalidateMatching((key) => {
        return Array.isArray(key) && key[0] === 'tasks';
    });
}

export function useGetTasksQuery(filter?: TaskListFilter) {
    return useBackendQuery(
        taskKeys.list(filter),
        (appDataSource) => {
            return appDataSource.task.list(filter);
        },
        {
            refreshInterval: 3000, // Poll active tasks periodically for status updates
        },
    );
}

export function useGetTaskQuery(taskId: string | null) {
    return useBackendQuery(
        taskKeys.detail(taskId),
        (appDataSource) => {
            if (!taskId) {
                return Promise.resolve(undefined);
            }
            return appDataSource.task.get(taskId);
        },
        {
            skip: !taskId,
            refreshInterval: 2000,
        },
    );
}

export function useGetTaskCommentsQuery(taskId: string | null) {
    return useBackendQuery(
        taskKeys.comments(taskId),
        (appDataSource) => {
            if (!taskId) {
                return Promise.resolve([]);
            }
            return appDataSource.task.listComments(taskId);
        },
        {
            skip: !taskId,
            refreshInterval: 2000,
        },
    );
}

export function useCreateTaskMutation() {
    return useBackendMutation({
        errorMessage: 'Failed to create task',
        successMessage: (task: Task) => {
            return `Task "${task.title}" created`;
        },
        run: (appDataSource, input: TaskCreateInput) => {
            return appDataSource.task.create(input);
        },
        revalidate: async (_arg, _result, { revalidateMatching }) => {
            await revalidateTaskData(revalidateMatching);
        },
    });
}

export function useUpdateTaskMutation() {
    return useBackendMutation({
        errorMessage: 'Failed to update task',
        successMessage: 'Task updated',
        run: (appDataSource, { id, updates }: { id: string; updates: TaskUpdateInput }) => {
            return appDataSource.task.update(id, updates);
        },
        revalidate: async (_arg, _result, { revalidateMatching }) => {
            await revalidateTaskData(revalidateMatching);
        },
    });
}

export function useCloseTaskMutation() {
    return useBackendMutation({
        errorMessage: 'Failed to close task',
        successMessage: 'Task closed',
        run: (appDataSource, taskId: string) => {
            return appDataSource.task.close(taskId);
        },
        revalidate: async (_arg, _result, { revalidateMatching }) => {
            await revalidateTaskData(revalidateMatching);
        },
    });
}

export function useOverrideTaskStatusMutation() {
    return useBackendMutation({
        errorMessage: 'Failed to update task status',
        successMessage: (_result, { status }: { id: string; status: Task['status'] }) => {
            return `Status set to ${status}`;
        },
        run: (appDataSource, { id, status }: { id: string; status: Task['status'] }) => {
            return appDataSource.task.overrideStatus(id, status);
        },
        revalidate: async (_arg, _result, { revalidateMatching }) => {
            await revalidateTaskData(revalidateMatching);
        },
    });
}

export function useLinkTasksMutation() {
    return useBackendMutation({
        errorMessage: 'Failed to link tasks',
        successMessage: 'Follow-up task linked',
        run: (appDataSource, { sourceTaskId, targetTaskId }: { sourceTaskId: string; targetTaskId: string }) => {
            return appDataSource.task.link(sourceTaskId, targetTaskId);
        },
        revalidate: async (_arg, _result, { revalidateMatching }) => {
            await revalidateTaskData(revalidateMatching);
        },
    });
}

export function useUnlinkTaskMutation() {
    return useBackendMutation({
        errorMessage: 'Failed to unlink task',
        successMessage: 'Follow-up task unlinked',
        run: (appDataSource, sourceTaskId: string) => {
            return appDataSource.task.unlink(sourceTaskId);
        },
        revalidate: async (_arg, _result, { revalidateMatching }) => {
            await revalidateTaskData(revalidateMatching);
        },
    });
}

export function useExecuteTaskMutation() {
    return useBackendMutation({
        errorMessage: 'Failed to start task execution',
        successMessage: 'Task execution started',
        run: (appDataSource, taskId: string) => {
            return appDataSource.task.execute(taskId);
        },
        revalidate: async (_arg, _result, { revalidateMatching }) => {
            await revalidateTaskData(revalidateMatching);
        },
    });
}

export function useCancelTaskMutation() {
    return useBackendMutation({
        errorMessage: 'Failed to cancel task execution',
        successMessage: 'Task cancelled',
        run: (appDataSource, taskId: string) => {
            return appDataSource.task.cancel(taskId);
        },
        revalidate: async (_arg, _result, { revalidateMatching }) => {
            await revalidateTaskData(revalidateMatching);
        },
    });
}

export function useCreateTaskCommentMutation() {
    return useBackendMutation({
        errorMessage: 'Failed to post comment',
        run: (appDataSource, { taskId, input }: { taskId: string; input: TaskCommentInput }) => {
            return appDataSource.task.createComment(taskId, input);
        },
        revalidate: async ({ taskId }, _result, { revalidateKeys }) => {
            await revalidateKeys([taskKeys.comments(taskId)]);
        },
    });
}
