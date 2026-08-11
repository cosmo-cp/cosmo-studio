import { useBackendMutation, useBackendQuery } from '@/lib/store/backend-hooks';
import type { Workflow, WorkflowCreateInput, WorkflowGraph } from 'core/dto';

const workflowKeys = {
    list: (searchQuery: string | null) => ['workflows', 'list', searchQuery ?? null] as const,
};

export function useGetWorkflowsQuery(searchQuery: string | null) {
    return useBackendQuery(workflowKeys.list(searchQuery), (appDataSource) => appDataSource.workflow.list(searchQuery));
}

export function useCreateWorkflowMutation() {
    return useBackendMutation({
        errorMessage: 'Failed to create workflow',
        run: (appDataSource, { input, graph }: { input: WorkflowCreateInput; graph: WorkflowGraph }) =>
            appDataSource.workflow.create(input, graph),
        revalidate: async (_arg, workflow, { setCachedValue }) => {
            await setCachedValue(workflowKeys.list(null), (currentWorkflows: Workflow[] | undefined) => [
                workflow,
                ...(currentWorkflows ?? []),
            ]);
        },
    });
}

export function useDeleteWorkflowMutation() {
    return useBackendMutation({
        errorMessage: 'Failed to delete workflow',
        run: (appDataSource, workflowId: string) => appDataSource.workflow.delete(workflowId),
        revalidate: async (workflowId, _result, { setCachedValue }) => {
            await setCachedValue(workflowKeys.list(null), (currentWorkflows: Workflow[] | undefined) =>
                (currentWorkflows ?? []).filter((workflow) => workflow.id !== workflowId),
            );
        },
    });
}
