'use client';

import type { WorkflowListItem } from '@/features/workflows/workflow-list-item';
import {
    useCreateWorkflowMutation,
    useDeleteWorkflowMutation,
    useGetWorkflowsQuery,
} from '@/features/workflows/workflows-api';
import type { WorkflowGraph } from 'core/dto';
import { useMemo, useState } from 'react';

const DEFAULT_WORKFLOW_GRAPH: WorkflowGraph = { nodes: [], edges: [] };

function toWorkflowListItem(workflow: {
    id: string;
    title: string;
    summary: string | null;
    updatedAt: Date;
    latestVersion: number;
}): WorkflowListItem {
    return {
        id: workflow.id,
        title: workflow.title,
        summary: workflow.summary ?? 'Empty workflow',
        updatedAt: workflow.updatedAt,
        latestVersion: workflow.latestVersion,
    };
}

export function useWorkflowPageState() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
    const [pendingDeleteWorkflow, setPendingDeleteWorkflow] = useState<WorkflowListItem | null>(null);
    const { data: workflowData = [] } = useGetWorkflowsQuery(null);
    const [createWorkflowMutation] = useCreateWorkflowMutation();
    const [deleteWorkflowMutation] = useDeleteWorkflowMutation();

    const workflows = useMemo(() => workflowData.map(toWorkflowListItem), [workflowData]);
    const normalizedSearchQuery = searchQuery.trim().toLowerCase();
    const selectedWorkflow = workflows.find((workflow) => workflow.id === selectedWorkflowId) ?? workflows[0] ?? null;
    const visibleWorkflows =
        normalizedSearchQuery.length > 0
            ? workflows.filter((workflow) => {
                  const title = workflow.title.toLowerCase();
                  const summary = workflow.summary.toLowerCase();
                  return title.includes(normalizedSearchQuery) || summary.includes(normalizedSearchQuery);
              })
            : workflows;

    const createWorkflow = async () => {
        const result = await createWorkflowMutation({
            input: {
                title: 'Untitled Workflow',
                summary: 'Empty workflow',
            },
            graph: DEFAULT_WORKFLOW_GRAPH,
        });

        if ('data' in result && result.data) {
            setSelectedWorkflowId(result.data.id);
        }
    };

    const confirmDeleteWorkflow = async () => {
        if (!pendingDeleteWorkflow) {
            return;
        }

        const result = await deleteWorkflowMutation(pendingDeleteWorkflow.id);
        if ('data' in result) {
            if (selectedWorkflowId === pendingDeleteWorkflow.id) {
                setSelectedWorkflowId(null);
            }
            setPendingDeleteWorkflow(null);
        }
    };

    return {
        workflows,
        visibleWorkflows,
        selectedWorkflow,
        pendingDeleteWorkflow,
        hasWorkflows: workflows.length > 0,
        searchWorkflows: setSearchQuery,
        selectWorkflow: setSelectedWorkflowId,
        requestDeleteWorkflow: setPendingDeleteWorkflow,
        clearPendingDeleteWorkflow: () => setPendingDeleteWorkflow(null),
        createWorkflow,
        confirmDeleteWorkflow,
    };
}
