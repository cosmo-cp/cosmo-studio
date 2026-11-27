'use client';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { HistoryPanel } from '@/components/history-panel';
import { PageEmptyState } from '@/components/page-empty-state';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { WorkflowWorkspace } from '@/components/workflow-workspace';
import { useWorkflowPageState } from '@/features/workflows/use-workflow-page-state';
import { formatHistoryTimestamp } from '@/lib/utils';
import { Plus, Trash2, Workflow } from 'lucide-react';

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
                <HistoryPanel
                    action={{
                        ariaLabel: 'New Workflow',
                        icon: Plus,
                        label: 'New Workflow',
                        onClick: createWorkflow,
                    }}
                    className="w-full max-w-xs shrink-0"
                    emptyState={<div className="p-4 text-sm text-muted-foreground">No workflows yet.</div>}
                    getItemKey={(workflow) => workflow.id}
                    items={visibleWorkflows}
                    onSearch={searchWorkflows}
                    renderPreview={(workflow) => ({
                        footerTrailing: (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        aria-label={`Delete ${workflow.title}`}
                                        className="h-8 w-8 shrink-0 cursor-pointer"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            requestDeleteWorkflow(workflow);
                                        }}
                                        size="icon"
                                        variant="ghost"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Delete Workflow</p>
                                </TooltipContent>
                            </Tooltip>
                        ),
                        headerTrailing: formatHistoryTimestamp(workflow.updatedAt),
                        onSelect: () => selectWorkflow(workflow.id),
                        selected: selectedWorkflow?.id === workflow.id,
                        summary: <p className="truncate pr-2 text-sm text-muted-foreground">{workflow.summary}</p>,
                        title: <h3 className="truncate font-medium">{workflow.title}</h3>,
                    })}
                    searchAriaLabel="Search workflows"
                    searchPlaceholder="Search workflows..."
                    title="Workflow"
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
