import type {
    Workspace,
    WorkspaceCreateInput,
    WorkspaceReachabilityResult,
    WorkspaceUpdateInput,
} from 'core/dto';
import { callRpc } from '../api/common';
import type { WorkspaceApi } from '../contracts/workspace';

export const workspaceHttpApi: WorkspaceApi = {
    list: () => {
        return callRpc<Workspace[]>('workspace', 'list', []);
    },
    get: (id: string) => {
        return callRpc<Workspace | undefined>('workspace', 'get', [id]);
    },
    create: (input: WorkspaceCreateInput) => {
        return callRpc<Workspace>('workspace', 'create', [input]);
    },
    update: (id: string, input: WorkspaceUpdateInput) => {
        return callRpc<Workspace>('workspace', 'update', [id, input]);
    },
    delete: (id: string) => {
        return callRpc<boolean>('workspace', 'delete', [id]);
    },
    pickFolder: () => {
        return callRpc<string | null>('workspace', 'pickFolder', []);
    },
    checkReachability: (id: string) => {
        return callRpc<WorkspaceReachabilityResult>('workspace', 'checkReachability', [id]);
    },
    checkAllReachability: () => {
        return callRpc<Record<string, WorkspaceReachabilityResult>>('workspace', 'checkAllReachability', []);
    },
};
