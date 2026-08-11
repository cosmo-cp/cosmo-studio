'use client';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { PageEmptyState } from '@/components/page-empty-state';
import { Button } from '@/components/ui/button';
import { WorkflowHistory } from '@/components/workflow-history';
import { WorkflowWorkspace } from '@/components/workflow-workspace';
import { useWorkflowPageState } from '@/features/workflows/use-workflow-page-state';
import { Workflow } from 'lucide-react';

export function WorkflowPageContent() {
    const {
        visibleWorkflows,
        selectedWorkflow,
        pendingDeleteWorkflow,
        hasWorkflows,
        searchWorkflows,
        selectWorkflow,
        requestDeleteWorkflow,
        clearPendingDeleteWorkflow,
        createWorkflow,
        confirmDeleteWorkflow,
    } = useWorkflowPageState();

    return (
        <>
            <div className="flex flex-1 min-h-0 overflow-hidden rounded-b-lg border-t-0 bg-background">
                <WorkflowHistory
                    workflows={visibleWorkflows}
                    selectedWorkflowId={selectedWorkflow?.id ?? null}
                    onCreateWorkflow={createWorkflow}
                    onDeleteWorkflow={requestDeleteWorkflow}
                    onSearch={searchWorkflows}
                    onSelectWorkflow={selectWorkflow}
                />
                {!hasWorkflows ? (
                    <PageEmptyState
                        icon={Workflow}
                        title="Start a new Workflow"
                        description="Create a workflow to begin building your flow."
                        action={
                            <Button variant="outline" size="sm" onClick={() => void createWorkflow()}>
                                New Workflow
                            </Button>
                        }
                    />
                ) : selectedWorkflow ? (
                    <WorkflowWorkspace key={selectedWorkflow.id} workflow={selectedWorkflow} />
                ) : (
                    <PageEmptyState
                        icon={Workflow}
                        title="Select a Workflow"
                        description="Choose a workflow from the history panel to open its canvas."
                    />
                )}
            </div>
            <ConfirmDialog
                open={pendingDeleteWorkflow !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        clearPendingDeleteWorkflow();
                    }
                }}
                title="Delete Workflow"
                description="Are you sure you want to delete this workflow? This action cannot be undone."
                confirmText="Delete"
                variant="destructive"
                onConfirm={confirmDeleteWorkflow}
            />
        </>
    );
}
