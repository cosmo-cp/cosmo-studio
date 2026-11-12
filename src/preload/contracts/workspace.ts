import type {
    Workspace,
    WorkspaceCreateInput,
    WorkspaceReachabilityResult,
    WorkspaceUpdateInput,
} from 'core/dto';

export interface WorkspaceApi {
    list(): Promise<Workspace[]>;
    get(id: string): Promise<Workspace | undefined>;
    create(input: WorkspaceCreateInput): Promise<Workspace>;
    update(id: string, input: WorkspaceUpdateInput): Promise<Workspace>;
    delete(id: string): Promise<boolean>;
    pickFolder(): Promise<string | null>;
    checkReachability(id: string): Promise<WorkspaceReachabilityResult>;
    checkAllReachability(): Promise<Record<string, WorkspaceReachabilityResult>>;
}
