'use client';

import {Canvas} from '@/components/ai-elements/canvas';
import {Controls} from '@/components/ai-elements/controls';
import {
    Node as CanvasNodeCard,
    NodeContent,
    NodeDescription,
    NodeHeader,
    NodeTitle,
} from '@/components/ai-elements/node';
import {Panel} from '@/components/ai-elements/panel';
import {Button} from '@/components/ui/button';
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@/components/ui/tooltip';
import type {WorkflowListItem} from '@/components/workflow-history';
import {
    Bot,
    Hand,
    MousePointer2,
    Sparkles,
    Workflow,
} from 'lucide-react';
import {useMemo, useRef, useState} from 'react';
import type {Edge, Node, NodeProps} from '@xyflow/react';
import {MarkerType} from '@xyflow/react';
import type {PointerEvent as ReactPointerEvent} from 'react';

type InteractionMode = 'hand' | 'pointer';

type WorkflowCanvasNodeData = {
    description: string;
    icon: 'workflow' | 'agent' | 'result';
    title: string;
};

const WORKFLOW_CANVAS_NODE_TYPE = 'workflow-card';
const DEFAULT_TOOLBAR_OFFSET = {
    x: 0,
    y: 84,
};

const CANVAS_NODE_TYPES = {
    [WORKFLOW_CANVAS_NODE_TYPE]: WorkflowCanvasNode,
};

function WorkflowCanvasNode({data}: NodeProps<Node<WorkflowCanvasNodeData>>) {
    const icon = data.icon === 'workflow' ?
        <Workflow className="size-4 text-muted-foreground" /> :
        data.icon === 'agent' ?
            <Bot className="size-4 text-muted-foreground" /> :
            <Sparkles className="size-4 text-muted-foreground" />;

    return (
        <CanvasNodeCard className="w-72" handles={{target: data.icon !== 'workflow', source: true}}>
            <NodeHeader className="flex flex-row items-center gap-2">
                {icon}
                <NodeTitle>{data.title}</NodeTitle>
            </NodeHeader>
            <NodeContent>
                <NodeDescription>{data.description}</NodeDescription>
            </NodeContent>
        </CanvasNodeCard>
    );
}

function WorkflowCanvasToolbar({
    interactionMode,
    onInteractionModeChange,
}: {
    interactionMode: InteractionMode;
    onInteractionModeChange: (mode: InteractionMode) => void;
}) {
    const dragStateRef = useRef<{
        pointerId: number;
        startClientX: number;
        startClientY: number;
        startX: number;
        startY: number;
    } | null>(null);
    const [toolbarOffset, setToolbarOffset] = useState(DEFAULT_TOOLBAR_OFFSET);
    const [isDragging, setIsDragging] = useState(false);

    // Keep the toolbar floating over the canvas while still allowing it to be repositioned.
    const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
        if ((event.target as HTMLElement).closest('[data-toolbar-button="true"]')) {
            return;
        }

        dragStateRef.current = {
            pointerId: event.pointerId,
            startClientX: event.clientX,
            startClientY: event.clientY,
            startX: toolbarOffset.x,
            startY: toolbarOffset.y,
        };
        setIsDragging(true);
        event.currentTarget.setPointerCapture?.(event.pointerId);
    };

    const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (!dragStateRef.current || dragStateRef.current.pointerId !== event.pointerId) {
            return;
        }

        const deltaX = event.clientX - dragStateRef.current.startClientX;
        const deltaY = event.clientY - dragStateRef.current.startClientY;
        setToolbarOffset({
            x: dragStateRef.current.startX + deltaX,
            y: dragStateRef.current.startY + deltaY,
        });
    };

    const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (!dragStateRef.current || dragStateRef.current.pointerId !== event.pointerId) {
            return;
        }

        dragStateRef.current = null;
        setIsDragging(false);
        event.currentTarget.releasePointerCapture?.(event.pointerId);
    };

    return (
        <Panel className="overflow-visible border-0 bg-transparent p-0 shadow-none" position="top-left">
            <TooltipProvider>
                <div
                    className="flex items-center gap-1 rounded-md border bg-background p-1 shadow-xs touch-none"
                    data-testid="workflow-toolbar"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    style={{
                        cursor: isDragging ? 'grabbing' : 'grab',
                        transform: `translate(${toolbarOffset.x}px, ${toolbarOffset.y}px)`,
                    }}
                >
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                aria-label="Pointer mode"
                                aria-pressed={interactionMode === 'pointer'}
                                data-toolbar-button="true"
                                onClick={() => onInteractionModeChange('pointer')}
                                onPointerDown={(event) => event.stopPropagation()}
                                size="icon"
                                variant={interactionMode === 'pointer' ? 'secondary' : 'ghost'}
                            >
                                <MousePointer2 className="size-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Pointer mode</p>
                        </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                aria-label="Hand mode"
                                aria-pressed={interactionMode === 'hand'}
                                data-toolbar-button="true"
                                onClick={() => onInteractionModeChange('hand')}
                                onPointerDown={(event) => event.stopPropagation()}
                                size="icon"
                                variant={interactionMode === 'hand' ? 'secondary' : 'ghost'}
                            >
                                <Hand className="size-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Hand mode</p>
                        </TooltipContent>
                    </Tooltip>
                </div>
            </TooltipProvider>
        </Panel>
    );
}

export function WorkflowCanvas({workflow}: {workflow: WorkflowListItem}) {
    const [interactionMode, setInteractionMode] = useState<InteractionMode>('pointer');

    const nodes = useMemo<Node<WorkflowCanvasNodeData>[]>(() => ([
        {
            id: `${workflow.id}-workflow`,
            type: WORKFLOW_CANVAS_NODE_TYPE,
            position: {x: 80, y: 190},
            data: {
                icon: 'workflow',
                title: workflow.title,
                description: 'Workflow entry point. Add steps here to define the flow.',
            },
        },
        {
            id: `${workflow.id}-agent`,
            type: WORKFLOW_CANVAS_NODE_TYPE,
            position: {x: 430, y: 190},
            data: {
                icon: 'agent',
                title: 'Agent Step',
                description: 'Use AI SDK tools and prompts to process the workflow input.',
            },
        },
        {
            id: `${workflow.id}-result`,
            type: WORKFLOW_CANVAS_NODE_TYPE,
            position: {x: 780, y: 190},
            data: {
                icon: 'result',
                title: 'Result',
                description: 'Render or persist the workflow output once execution completes.',
            },
        },
    ]), [workflow.id, workflow.title]);

    const edges = useMemo<Edge[]>(() => ([
        {
            id: `${workflow.id}-edge-1`,
            source: `${workflow.id}-workflow`,
            target: `${workflow.id}-agent`,
            markerEnd: {type: MarkerType.ArrowClosed},
        },
        {
            id: `${workflow.id}-edge-2`,
            source: `${workflow.id}-agent`,
            target: `${workflow.id}-result`,
            markerEnd: {type: MarkerType.ArrowClosed},
        },
    ]), [workflow.id]);

    return (
        <div className="flex h-full flex-1 min-h-0 overflow-hidden bg-background">
            <Canvas
                className="h-full w-full"
                edges={edges}
                fitViewOptions={{padding: 0.2}}
                nodeTypes={CANVAS_NODE_TYPES}
                nodesDraggable={interactionMode === 'pointer'}
                nodes={nodes}
                panOnDrag={interactionMode === 'hand'}
                proOptions={{hideAttribution: true}}
                selectionOnDrag={interactionMode === 'pointer'}
            >
                <WorkflowCanvasToolbar
                    interactionMode={interactionMode}
                    onInteractionModeChange={setInteractionMode}
                />
                <Controls showInteractive={false} />
            </Canvas>
        </div>
    );
}
