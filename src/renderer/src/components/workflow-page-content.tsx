'use client';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
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
                                <Button variant="outline" size="sm" onClick={() => void createWorkflow()}>
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
