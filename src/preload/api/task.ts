import { ipcRenderer } from 'electron';
import type {
    Task,
    TaskCommentInput,
    TaskCreateInput,
    TaskListFilter,
    TaskUpdateInput,
} from 'core/dto';
import type { TaskApi } from '../contracts/task';

export const taskApi: TaskApi = {
    list: (filter?: TaskListFilter) => {
        return ipcRenderer.invoke('task:list', filter);
    },
    get: (id: string) => {
        return ipcRenderer.invoke('task:get', id);
    },
    create: (input: TaskCreateInput) => {
        return ipcRenderer.invoke('task:create', input);
    },
    update: (id: string, updates: TaskUpdateInput) => {
        return ipcRenderer.invoke('task:update', id, updates);
    },
    close: (id: string) => {
        return ipcRenderer.invoke('task:close', id);
    },
    overrideStatus: (id: string, status: Task['status']) => {
        return ipcRenderer.invoke('task:overrideStatus', id, status);
    },
    link: (sourceTaskId: string, targetTaskId: string) => {
        return ipcRenderer.invoke('task:link', sourceTaskId, targetTaskId);
    },
    unlink: (sourceTaskId: string) => {
        return ipcRenderer.invoke('task:unlink', sourceTaskId);
    },
    execute: (taskId: string) => {
        return ipcRenderer.invoke('task:execute', taskId);
    },
    cancel: (taskId: string) => {
        return ipcRenderer.invoke('task:cancel', taskId);
    },
    listComments: (taskId: string) => {
        return ipcRenderer.invoke('task:listComments', taskId);
    },
    createComment: (taskId: string, input: TaskCommentInput) => {
        return ipcRenderer.invoke('task:createComment', taskId, input);
    },
};
