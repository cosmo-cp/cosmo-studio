import type {
    Task,
    TaskComment,
    TaskCommentInput,
    TaskCreateInput,
    TaskListFilter,
    TaskUpdateInput,
    TaskWithLinks,
} from 'core/dto';

export interface TaskApi {
    list(filter?: TaskListFilter): Promise<Task[]>;
    get(id: string): Promise<TaskWithLinks | undefined>;
    create(input: TaskCreateInput): Promise<Task>;
    update(id: string, updates: TaskUpdateInput): Promise<Task>;
    close(id: string): Promise<Task>;
    overrideStatus(id: string, status: Task['status']): Promise<Task>;
    link(sourceTaskId: string, targetTaskId: string): Promise<void>;
    unlink(sourceTaskId: string): Promise<void>;
    execute(taskId: string): Promise<Task>;
    cancel(taskId: string): Promise<void>;
    listComments(taskId: string): Promise<TaskComment[]>;
    createComment(taskId: string, input: TaskCommentInput): Promise<TaskComment>;
}
