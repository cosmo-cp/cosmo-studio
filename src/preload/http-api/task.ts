import type {
    Task,
    TaskComment,
    TaskCommentInput,
    TaskCreateInput,
    TaskListFilter,
    TaskUpdateInput,
    TaskWithLinks,
} from 'core/dto';
import { callRpc } from '../api/common';
import type { TaskApi } from '../contracts/task';

export const taskHttpApi: TaskApi = {
    list: (filter?: TaskListFilter) => {
        return callRpc<Task[]>('task', 'list', [filter]);
    },
    get: (id: string) => {
        return callRpc<TaskWithLinks | undefined>('task', 'get', [id]);
    },
    create: (input: TaskCreateInput) => {
        return callRpc<Task>('task', 'create', [input]);
    },
    update: (id: string, updates: TaskUpdateInput) => {
        return callRpc<Task>('task', 'update', [id, updates]);
    },
    close: (id: string) => {
        return callRpc<Task>('task', 'close', [id]);
    },
    overrideStatus: (id: string, status: Task['status']) => {
        return callRpc<Task>('task', 'overrideStatus', [id, status]);
    },
    link: (sourceTaskId: string, targetTaskId: string) => {
        return callRpc<void>('task', 'link', [sourceTaskId, targetTaskId]);
    },
    unlink: (sourceTaskId: string) => {
        return callRpc<void>('task', 'unlink', [sourceTaskId]);
    },
    execute: (taskId: string) => {
        return callRpc<Task>('task', 'execute', [taskId]);
    },
    cancel: (taskId: string) => {
        return callRpc<void>('task', 'cancel', [taskId]);
    },
    listComments: (taskId: string) => {
        return callRpc<TaskComment[]>('task', 'listComments', [taskId]);
    },
    createComment: (taskId: string, input: TaskCommentInput) => {
        return callRpc<TaskComment>('task', 'createComment', [taskId, input]);
    },
};
