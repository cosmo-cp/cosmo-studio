'use client';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { WorkflowHistory, type WorkflowListItem } from '@/components/workflow-history';
import { WorkflowWorkspace } from '@/components/workflow-workspace';
import { useAppDataSource } from '@/app/store-provider';
import type { WorkflowGraph } from 'core/dto';
import { Workflow } from 'lucide-react';
import { useEffect, useState } from 'react';

const DEFAULT_WORKFLOW_GRAPH: WorkflowGraph = { nodes: [], edges: [] };

export function WorkflowPageContent() {
    const appDataSource = useAppDataSource();
    const [searchQuery, setSearchQuery] = useState('');
    const [workflows, setWorkflows] = useState<WorkflowListItem[]>([]);
    const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
    const [pendingDeleteWorkflow, setPendingDeleteWorkflow] = useState<WorkflowListItem | null>(null);

    const normalizedSearchQuery = searchQuery.trim().toLowerCase();
    const selectedWorkflow = workflows.find((workflow) => workflow.id === selectedWorkflowId) ?? null;
    const visibleWorkflows =
        normalizedSearchQuery.length > 0
            ? workflows.filter((workflow) => {
                  const title = workflow.title.toLowerCase();
                  const summary = workflow.summary.toLowerCase();
                  return title.includes(normalizedSearchQuery) || summary.includes(normalizedSearchQuery);
              })
            : workflows;

    useEffect(() => {
        void appDataSource.workflow.list(null).then((items) => {
            setWorkflows(
                items.map((item) => ({
                    id: item.id,
                    title: item.title,
                    summary: item.summary ?? 'Empty workflow',
                    updatedAt: item.updatedAt,
                    latestVersion: item.latestVersion,
                })),
            );
        });
    }, [appDataSource]);

    const handleCreateWorkflow = async () => {
        const created = await appDataSource.workflow.create(
            {
                title: 'Untitled Workflow',
                summary: 'Empty workflow',
            },
            DEFAULT_WORKFLOW_GRAPH,
        );
        const nextWorkflow: WorkflowListItem = {
            id: created.id,
            title: created.title,
            summary: created.summary ?? 'Empty workflow',
            updatedAt: created.updatedAt,
            latestVersion: created.latestVersion,
        };
        setWorkflows((currentWorkflows) => [nextWorkflow, ...currentWorkflows]);
        setSelectedWorkflowId(nextWorkflow.id);
    };

    // Keep destructive actions explicit even for temporary client-side workflow entries.
    const handleConfirmDeleteWorkflow = async () => {
        if (!pendingDeleteWorkflow) {
            return;
        }
        await appDataSource.workflow.delete(pendingDeleteWorkflow.id);

        const nextWorkflows = workflows.filter((workflow) => workflow.id !== pendingDeleteWorkflow.id);
        setWorkflows(nextWorkflows);
        setSelectedWorkflowId((currentWorkflowId) => {
            if (currentWorkflowId !== pendingDeleteWorkflow.id) {
                return currentWorkflowId;
            }
            return nextWorkflows[0]?.id ?? null;
        });
        setPendingDeleteWorkflow(null);
    };

    return (
        <>
            <div className="flex flex-1 min-h-0 overflow-hidden rounded-b-lg border-t-0 bg-background">
                <WorkflowHistory
                    workflows={visibleWorkflows}
                    selectedWorkflowId={selectedWorkflowId}
                    onCreateWorkflow={handleCreateWorkflow}
                    onDeleteWorkflow={setPendingDeleteWorkflow}
                    onSearch={setSearchQuery}
                    onSelectWorkflow={setSelectedWorkflowId}
                />
                {workflows.length === 0 ? (
                    <div className="flex h-full flex-1 flex-col items-center justify-center">
                        <Empty>
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <Workflow />
                                </EmptyMedia>
                                <EmptyTitle>Start a new Workflow</EmptyTitle>
                                <EmptyDescription>Create a workflow to begin building your flow.</EmptyDescription>
                            </EmptyHeader>
                            <EmptyContent>
                                <Button variant="outline" size="sm" onClick={() => void handleCreateWorkflow()}>
                                    New Workflow
                                </Button>
                            </EmptyContent>
                        </Empty>
                    </div>
                ) : selectedWorkflow ? (
                    <WorkflowWorkspace key={selectedWorkflow.id} workflow={selectedWorkflow} />
                ) : (
                    <div className="flex h-full flex-1 flex-col items-center justify-center">
                        <Empty>
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <Workflow />
                                </EmptyMedia>
                                <EmptyTitle>Select a Workflow</EmptyTitle>
                                <EmptyDescription>
                                    Choose a workflow from the history panel to open its canvas.
                                </EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    </div>
                )}
            </div>
            <ConfirmDialog
                open={pendingDeleteWorkflow !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setPendingDeleteWorkflow(null);
                    }
                }}
                title="Delete Workflow"
                description="Are you sure you want to delete this workflow? This action cannot be undone."
                confirmText="Delete"
                variant="destructive"
                onConfirm={handleConfirmDeleteWorkflow}
            />
        </>
    );
}
