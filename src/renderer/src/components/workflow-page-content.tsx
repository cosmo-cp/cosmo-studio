'use client';

import {Button} from '@/components/ui/button';
import {Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from '@/components/ui/empty';
import {ConfirmDialog} from '@/components/confirm-dialog';
import {WorkflowCanvas} from '@/components/workflow-canvas';
import {WorkflowHistory, type WorkflowListItem} from '@/components/workflow-history';
import {Workflow} from 'lucide-react';
import {useRef, useState} from 'react';

// Keep untitled workflow names predictable while there is no persisted workflow backend yet.
function buildWorkflow(index: number): WorkflowListItem {
    return {
        id: `workflow-${index}`,
        title: index === 1 ? 'Untitled Workflow' : `Untitled Workflow ${index}`,
        summary: 'Empty workflow',
        updatedAt: new Date(),
    };
}

export function WorkflowPageContent() {
    const nextWorkflowIndexRef = useRef(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [workflows, setWorkflows] = useState<WorkflowListItem[]>([]);
    const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
    const [pendingDeleteWorkflow, setPendingDeleteWorkflow] = useState<WorkflowListItem | null>(null);

    const normalizedSearchQuery = searchQuery.trim().toLowerCase();
    const selectedWorkflow = workflows.find((workflow) => workflow.id === selectedWorkflowId) ?? null;
    const visibleWorkflows = normalizedSearchQuery.length > 0 ?
        workflows.filter((workflow) => {
            const title = workflow.title.toLowerCase();
            const summary = workflow.summary.toLowerCase();
            return title.includes(normalizedSearchQuery) || summary.includes(normalizedSearchQuery);
        }) :
        workflows;

    // Create placeholder workflows so the page structure can be exercised before the data layer exists.
    const handleCreateWorkflow = () => {
        const nextWorkflow = buildWorkflow(nextWorkflowIndexRef.current);
        nextWorkflowIndexRef.current += 1;
        setWorkflows((currentWorkflows) => [nextWorkflow, ...currentWorkflows]);
        setSelectedWorkflowId(nextWorkflow.id);
    };

    // Keep destructive actions explicit even for temporary client-side workflow entries.
    const handleConfirmDeleteWorkflow = () => {
        if (!pendingDeleteWorkflow) {
            return;
        }

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
                                <EmptyDescription>
                                    Create a workflow to begin building your flow.
                                </EmptyDescription>
                            </EmptyHeader>
                            <EmptyContent>
                                <Button variant="outline" size="sm" onClick={handleCreateWorkflow}>
                                    New Workflow
                                </Button>
                            </EmptyContent>
                        </Empty>
                    </div>
                ) : selectedWorkflow ? (
                    <WorkflowCanvas workflow={selectedWorkflow} />
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
