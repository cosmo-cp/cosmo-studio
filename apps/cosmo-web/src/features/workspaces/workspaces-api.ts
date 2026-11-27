import type { BackendCacheHelpers } from '@/lib/store/backend-hooks';
import { useBackendMutation, useBackendQuery } from '@/lib/store/backend-hooks';
import type { Workspace, WorkspaceCreateInput, WorkspaceUpdateInput } from 'core/dto';

export const workspaceKeys = {
    all: ['workspaces'] as const,
    list: () => ['workspaces', 'list'] as const,
    detail: (id: string | null) => ['workspaces', 'detail', id] as const,
};

async function revalidateWorkspaceData(revalidateMatching: BackendCacheHelpers['revalidateMatching']) {
    await revalidateMatching((key) => {
        return Array.isArray(key) && key[0] === 'workspaces';
    });
}

export function useGetWorkspacesQuery() {
    return useBackendQuery(workspaceKeys.list(), (appDataSource) => {
        return appDataSource.workspace.list();
    });
}

export function useGetWorkspaceQuery(workspaceId: string | null) {
    return useBackendQuery(
        workspaceKeys.detail(workspaceId),
        (appDataSource) => {
            if (!workspaceId) {
                return Promise.resolve(undefined);
            }
            return appDataSource.workspace.get(workspaceId);
        },
        {
            skip: !workspaceId,
        },
    );
}

export function useCreateWorkspaceMutation() {
    return useBackendMutation({
        errorMessage: 'Failed to create workspace',
        successMessage: (workspace: Workspace) => `Workspace "${workspace.name}" added`,
        run: (appDataSource, input: WorkspaceCreateInput) => {
            return appDataSource.workspace.create(input);
        },
        revalidate: async (_arg, _result, { revalidateMatching }) => {
            await revalidateWorkspaceData(revalidateMatching);
        },
    });
}

export function useUpdateWorkspaceMutation() {
    return useBackendMutation({
        errorMessage: 'Failed to update workspace',
        successMessage: 'Workspace updated',
        run: (appDataSource, { id, input }: { id: string; input: WorkspaceUpdateInput }) => {
            return appDataSource.workspace.update(id, input);
        },
        revalidate: async (_arg, _result, { revalidateMatching }) => {
            await revalidateWorkspaceData(revalidateMatching);
        },
    });
}

export function useDeleteWorkspaceMutation() {
    return useBackendMutation({
        errorMessage: 'Failed to delete workspace',
        successMessage: 'Workspace removed',
        run: (appDataSource, id: string) => {
            return appDataSource.workspace.delete(id);
        },
        revalidate: async (_arg, _result, { revalidateMatching }) => {
            await revalidateWorkspaceData(revalidateMatching);
        },
    });
}

export function usePickFolderMutation() {
    return useBackendMutation({
        errorMessage: 'Failed to pick directory',
        run: (appDataSource) => {
            return appDataSource.workspace.pickFolder();
        },
    });
}

export function useCheckReachabilityMutation() {
    return useBackendMutation({
        errorMessage: 'Failed to check folder status',
        run: (appDataSource, id: string) => {
            return appDataSource.workspace.checkReachability(id);
        },
    });
}

export function useCheckAllReachabilityMutation() {
    return useBackendMutation({
        errorMessage: 'Failed to refresh workspace statuses',
        run: (appDataSource) => {
            return appDataSource.workspace.checkAllReachability();
        },
    });
}
