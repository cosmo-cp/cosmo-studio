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
    GripHorizontal,
    Hand,
    MousePointer2,
    Plus,
    Sparkles,
    Workflow,
} from 'lucide-react';
import {useCallback, useEffect, useRef, useState} from 'react';
import type {Edge, Node, NodeProps} from '@xyflow/react';
import {MarkerType, useEdgesState, useNodesState} from '@xyflow/react';
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
    y: 0,
};

const CANVAS_NODE_TYPES = {
    [WORKFLOW_CANVAS_NODE_TYPE]: WorkflowCanvasNode,
};

function buildInitialNodes(workflow: WorkflowListItem): Node<WorkflowCanvasNodeData>[] {
    return [
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
    ];
}

function buildInitialEdges(workflow: WorkflowListItem): Edge[] {
    return [
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
    ];
}

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
    onAddNode,
    interactionMode,
    onInteractionModeChange,
}: {
    onAddNode: () => void;
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

    // Keep the toolbar floating over the canvas while still allowing it to be repositioned from a dedicated handle.
    const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (!(event.target as HTMLElement).closest('[data-toolbar-drag="true"]')) {
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
        <Panel
            className="m-0 overflow-visible border-0 bg-transparent p-0 shadow-none"
            data-testid="workflow-toolbar-panel"
            position="top-left"
            style={{
                left: '16px',
                top: '50%',
                transform: `translate(${toolbarOffset.x}px, calc(-50% + ${toolbarOffset.y}px))`,
            }}
        >
            <TooltipProvider>
                <div
                    className="flex flex-col items-center gap-1 rounded-md border bg-background p-1 shadow-xs touch-none"
                    data-testid="workflow-toolbar"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                >
                    <div
                        aria-hidden="true"
                        className="flex items-center justify-center px-1 py-1 text-muted-foreground/45"
                        data-testid="workflow-toolbar-handle"
                        data-toolbar-drag="true"
                        style={{cursor: isDragging ? 'grabbing' : 'grab'}}
                    >
                        <GripHorizontal className="pointer-events-none size-4" />
                    </div>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                aria-label="Add node"
                                onClick={onAddNode}
                                onPointerDown={(event) => event.stopPropagation()}
                                size="icon"
                                variant="ghost"
                            >
                                <Plus className="size-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side='right'>
                            <p>Add node</p>
                        </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                aria-label="Pointer mode"
                                aria-pressed={interactionMode === 'pointer'}
                                onClick={() => onInteractionModeChange('pointer')}
                                onPointerDown={(event) => event.stopPropagation()}
                                size="icon"
                                variant={interactionMode === 'pointer' ? 'secondary' : 'ghost'}
                            >
                                <MousePointer2 className="size-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side='right'>
                            <p>Pointer mode</p>
                        </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                aria-label="Hand mode"
                                aria-pressed={interactionMode === 'hand'}
                                onClick={() => onInteractionModeChange('hand')}
                                onPointerDown={(event) => event.stopPropagation()}
                                size="icon"
                                variant={interactionMode === 'hand' ? 'secondary' : 'ghost'}
                            >
                                <Hand className="size-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side='right'>
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
    const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowCanvasNodeData>(buildInitialNodes(workflow));
    const [edges, setEdges, onEdgesChange] = useEdgesState(buildInitialEdges(workflow));
    const nextNodeIndexRef = useRef(1);

    useEffect(() => {
        setNodes(buildInitialNodes(workflow));
        setEdges(buildInitialEdges(workflow));
        nextNodeIndexRef.current = 1;
    }, [setEdges, setNodes, workflow]);

    const handleAddNode = useCallback(() => {
        const newNodeIndex = nextNodeIndexRef.current;
        nextNodeIndexRef.current += 1;

        setNodes((currentNodes) => {
            const additionalNodeCount = currentNodes.filter((node) => node.id.includes('-custom-')).length;
            const column = additionalNodeCount % 3;
            const row = Math.floor(additionalNodeCount / 3);

            return [
                ...currentNodes,
                {
                    id: `${workflow.id}-custom-${newNodeIndex}`,
                    type: WORKFLOW_CANVAS_NODE_TYPE,
                    position: {
                        x: 180 + (column * 320),
                        y: 410 + (row * 180),
                    },
                    data: {
                        icon: 'agent',
                        title: `Node ${newNodeIndex}`,
                        description: 'New workflow step. Configure this node next.',
                    },
                },
            ];
        });
    }, [setNodes, workflow.id]);

    return (
        <div className="flex h-full flex-1 min-h-0 overflow-hidden bg-background">
            <Canvas
                className="h-full w-full"
                edges={edges}
                fitViewOptions={{padding: 0.2}}
                nodeTypes={CANVAS_NODE_TYPES}
                nodesDraggable={interactionMode === 'pointer'}
                nodes={nodes}
                onEdgesChange={onEdgesChange}
                onNodesChange={onNodesChange}
                panOnDrag={interactionMode === 'hand'}
                proOptions={{hideAttribution: true}}
                selectionOnDrag={interactionMode === 'pointer'}
            >
                <WorkflowCanvasToolbar
                    onAddNode={handleAddNode}
                    interactionMode={interactionMode}
                    onInteractionModeChange={setInteractionMode}
                />
                <Controls showInteractive={false} />
            </Canvas>
        </div>
    );
}
