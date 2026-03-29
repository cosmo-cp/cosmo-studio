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
import {Card} from '@/components/ui/card';
import {cn} from '@/lib/utils';
import {Separator} from '@/components/ui/separator';
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@/components/ui/tooltip';
import type {WorkflowListItem} from '@/components/workflow-history';
import {
    CircleStop,
    Bot,
    Globe,
    GitBranch,
    GripHorizontal,
    Hand,
    MousePointer2,
    Plus,
    PlugZap,
    Repeat,
    ShieldCheck,
    Sparkles,
    Tags,
    Workflow,
} from 'lucide-react';
import {useCallback, useEffect, useRef, useState} from 'react';
import type {Connection, Edge, Node, NodeProps} from '@xyflow/react';
import {addEdge, Handle, MarkerType, Position, useEdgesState, useNodesState} from '@xyflow/react';
import type {PointerEvent as ReactPointerEvent} from 'react';

type InteractionMode = 'hand' | 'pointer';
type WorkflowNodeTemplateId =
    'agent' |
    'classify' |
    'end' |
    'http' |
    'if-else' |
    'loop' |
    'mcp' |
    'user-approval';
type WorkflowCanvasNodeTemplateId = WorkflowNodeTemplateId | 'start';
type WorkflowNodeGroupName = 'Core' | 'Logic' | 'Tools';
type WorkflowCanvasNodeIcon =
    'agent' |
    'classify' |
    'end' |
    'http' |
    'if-else' |
    'loop' |
    'mcp' |
    'user-approval' |
    'workflow';

type WorkflowCanvasNodeData = {
    description: string;
    icon: WorkflowCanvasNodeIcon;
    templateId: WorkflowCanvasNodeTemplateId;
    title: string;
};

type WorkflowNodeTemplate = {
    description: string;
    group: WorkflowNodeGroupName;
    icon: WorkflowCanvasNodeIcon;
    id: WorkflowNodeTemplateId;
    title: string;
};

const WORKFLOW_CANVAS_NODE_TYPE = 'workflow-card';
const DEFAULT_TOOLBAR_OFFSET = {
    x: 0,
    y: 0,
};
const WORKFLOW_NODE_GROUPS: {name: WorkflowNodeGroupName; nodes: WorkflowNodeTemplate[]}[] = [
    {
        name: 'Core',
        nodes: [
            {
                id: 'agent',
                title: 'Agent',
                group: 'Core',
                icon: 'agent',
                description: 'Run an AI-powered task or decision step.',
            },
            {
                id: 'end',
                title: 'End',
                group: 'Core',
                icon: 'end',
                description: 'Mark where a workflow path completes.',
            },
            {
                id: 'classify',
                title: 'Classify',
                group: 'Core',
                icon: 'classify',
                description: 'Route execution based on a classification result.',
            },
        ],
    },
    {
        name: 'Logic',
        nodes: [
            {
                id: 'if-else',
                title: 'If / Else',
                group: 'Logic',
                icon: 'if-else',
                description: 'Branch the flow into conditional paths.',
            },
            {
                id: 'loop',
                title: 'Loop',
                group: 'Logic',
                icon: 'loop',
                description: 'Repeat a set of steps until the loop exits.',
            },
            {
                id: 'user-approval',
                title: 'User Approval',
                group: 'Logic',
                icon: 'user-approval',
                description: 'Pause the workflow until a person approves it.',
            },
        ],
    },
    {
        name: 'Tools',
        nodes: [
            {
                id: 'mcp',
                title: 'MCP',
                group: 'Tools',
                icon: 'mcp',
                description: 'Call an MCP server as part of the workflow.',
            },
            {
                id: 'http',
                title: 'HTTP',
                group: 'Tools',
                icon: 'http',
                description: 'Send an HTTP request to an external system.',
            },
        ],
    },
];
const INITIAL_WORKFLOW_NODE_TEMPLATE_IDS: WorkflowNodeTemplateId[] = ['agent', 'end'];
const WORKFLOW_NODE_TEMPLATES_BY_ID = new Map<WorkflowNodeTemplate['id'], WorkflowNodeTemplate>(
    WORKFLOW_NODE_GROUPS.flatMap((group) => group.nodes).map((template) => [template.id, template])
);

const CANVAS_NODE_TYPES = {
    [WORKFLOW_CANVAS_NODE_TYPE]: WorkflowCanvasNode,
};

function buildWorkflowRootNodeData(workflow: WorkflowListItem): WorkflowCanvasNodeData {
    return {
        icon: 'workflow',
        templateId: 'start',
        title: 'Start',
        description: `Entry point for ${workflow.title}. Add steps here to define the flow.`,
    };
}

function buildNodeData(templateId: WorkflowNodeTemplateId): WorkflowCanvasNodeData {
    const template = WORKFLOW_NODE_TEMPLATES_BY_ID.get(templateId);

    if (!template) {
        throw new Error(`Unknown workflow node template: ${templateId}`);
    }

    return {
        description: template.description,
        icon: template.icon,
        templateId: template.id,
        title: template.title,
    };
}

function buildInitialNodes(workflow: WorkflowListItem): Node<WorkflowCanvasNodeData>[] {
    return [
        {
            id: `${workflow.id}-start`,
            type: WORKFLOW_CANVAS_NODE_TYPE,
            position: {x: 80, y: 190},
            deletable: false,
            data: buildWorkflowRootNodeData(workflow),
        },
        ...INITIAL_WORKFLOW_NODE_TEMPLATE_IDS.map((templateId, index) => ({
            id: `${workflow.id}-${templateId}`,
            type: WORKFLOW_CANVAS_NODE_TYPE,
            position: {x: 430 + (index * 350), y: 190},
            data: buildNodeData(templateId),
        })),
    ];
}

function buildInitialEdges(workflow: WorkflowListItem): Edge[] {
    return [
        {
            id: `${workflow.id}-edge-1`,
            source: `${workflow.id}-start`,
            target: `${workflow.id}-agent`,
            markerEnd: {type: MarkerType.ArrowClosed},
        },
        {
            id: `${workflow.id}-edge-2`,
            source: `${workflow.id}-agent`,
            target: `${workflow.id}-end`,
            markerEnd: {type: MarkerType.ArrowClosed},
        },
    ];
}

function WorkflowCanvasNode({data}: NodeProps<Node<WorkflowCanvasNodeData>>) {
    const icon = data.icon === 'workflow' ?
        <Workflow className="size-4 text-muted-foreground" /> :
        data.icon === 'agent' ?
            <Bot className="size-4 text-muted-foreground" /> :
            data.icon === 'end' ?
                <CircleStop className="size-4 text-muted-foreground" /> :
                data.icon === 'classify' ?
                    <Tags className="size-4 text-muted-foreground" /> :
                    data.icon === 'if-else' ?
                        <GitBranch className="size-4 text-muted-foreground" /> :
                        data.icon === 'loop' ?
                            <Repeat className="size-4 text-muted-foreground" /> :
                            data.icon === 'user-approval' ?
                                <ShieldCheck className="size-4 text-muted-foreground" /> :
                                data.icon === 'mcp' ?
                                    <PlugZap className="size-4 text-muted-foreground" /> :
                                    data.icon === 'http' ?
                                        <Globe className="size-4 text-muted-foreground" /> :
                                        <Sparkles className="size-4 text-muted-foreground" />;
    const hasTargetHandle = data.templateId !== 'start';

    return (
        <CanvasNodeCard className="relative w-72" handles={{target: false, source: false}}>
            {hasTargetHandle ? (
                <Handle
                    aria-label={`${data.title} end connection`}
                    className={cn(
                        '!left-0 !size-4 !-translate-x-1/2 !rounded-full !border-2 !border-primary !bg-background shadow-sm'
                    )}
                    position={Position.Left}
                    type="target"
                />
            ) : null}
            <Handle
                aria-label={`${data.title} start connection`}
                className={cn(
                    '!right-0 !size-6 !translate-x-1/2 !rounded-full !border-2 !border-background !bg-primary !text-primary-foreground shadow-sm',
                    "after:absolute after:inset-0 after:flex after:items-center after:justify-center after:text-sm after:font-semibold after:text-primary-foreground after:content-['+']"
                )}
                position={Position.Right}
                type="source"
            />
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

function WorkflowNodePicker({
    onSelect,
}: {
    onSelect: (templateId: WorkflowNodeTemplate['id']) => void;
}) {
    return (
        <Panel
            className="m-0 border-0 bg-transparent p-0 shadow-none"
            data-testid="workflow-node-picker-panel"
            position="top-left"
            style={{
                left: '72px',
                top: '50%',
                transform: 'translate(0px, -50%)',
            }}
        >
            <TooltipProvider>
                <Card
                    aria-label="Workflow node picker"
                    className="max-w-[calc(100vw-120px)] gap-0 overflow-hidden py-2 shadow-sm"
                    data-node-picker-surface="true"
                    data-testid="workflow-node-picker"
                    id="workflow-node-picker"
                    role="dialog"
                    style={{width: 'min(280px, calc(100vw - 120px))'}}
                >
                    {WORKFLOW_NODE_GROUPS.map((group, groupIndex) => (
                        <div key={group.name}>
                            {groupIndex > 0 ? <Separator /> : null}
                            <div className="px-3 pb-1 pt-2">
                                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                                    {group.name}
                                </p>
                            </div>
                            <div className="space-y-0.5 px-2 pb-2">
                                {group.nodes.map((template) => (
                                    <Tooltip key={template.id}>
                                        <TooltipTrigger asChild>
                                            <Button
                                                className="h-9 w-full justify-start gap-2.5 px-2.5 text-left"
                                                onClick={() => onSelect(template.id)}
                                                variant="ghost"
                                            >
                                                <span className="flex size-7 shrink-0 items-center justify-center rounded-md border bg-muted/40">
                                                    {template.icon === 'agent' ? <Bot className="size-3.5 text-muted-foreground" /> :
                                                        template.icon === 'end' ? <CircleStop className="size-3.5 text-muted-foreground" /> :
                                                            template.icon === 'classify' ? <Tags className="size-3.5 text-muted-foreground" /> :
                                                                template.icon === 'if-else' ? <GitBranch className="size-3.5 text-muted-foreground" /> :
                                                                    template.icon === 'loop' ? <Repeat className="size-3.5 text-muted-foreground" /> :
                                                                        template.icon === 'user-approval' ? <ShieldCheck className="size-3.5 text-muted-foreground" /> :
                                                                            template.icon === 'mcp' ? <PlugZap className="size-3.5 text-muted-foreground" /> :
                                                                                <Globe className="size-3.5 text-muted-foreground" />}
                                                </span>
                                                <span className="truncate text-sm font-medium">
                                                    {template.title}
                                                </span>
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side='right'>
                                            <p>{template.description}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                ))}
                            </div>
                        </div>
                    ))}
                </Card>
            </TooltipProvider>
        </Panel>
    );
}

function WorkflowCanvasToolbar({
    onAddNode,
    isNodePickerOpen,
    interactionMode,
    onInteractionModeChange,
}: {
    onAddNode: () => void;
    isNodePickerOpen: boolean;
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
                                aria-expanded={isNodePickerOpen}
                                aria-pressed={isNodePickerOpen}
                                aria-controls="workflow-node-picker"
                                data-node-picker-trigger="true"
                                onClick={onAddNode}
                                onPointerDown={(event) => event.stopPropagation()}
                                size="icon"
                                variant={isNodePickerOpen ? 'secondary' : 'ghost'}
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

function WorkflowCanvasContent({workflow}: {workflow: WorkflowListItem}) {
    const [interactionMode, setInteractionMode] = useState<InteractionMode>('pointer');
    const [isNodePickerOpen, setIsNodePickerOpen] = useState(false);
    const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowCanvasNodeData>(buildInitialNodes(workflow));
    const [edges, setEdges, onEdgesChange] = useEdgesState(buildInitialEdges(workflow));
    const nextNodeIndexRef = useRef(1);

    useEffect(() => {
        if (!isNodePickerOpen) {
            return;
        }

        const handlePointerDown = (event: PointerEvent) => {
            if (!(event.target instanceof Element)) {
                return;
            }

            if (
                event.target.closest('[data-node-picker-surface="true"]') ||
                event.target.closest('[data-node-picker-trigger="true"]')
            ) {
                return;
            }

            setIsNodePickerOpen(false);
        };

        document.addEventListener('pointerdown', handlePointerDown, true);

        return () => {
            document.removeEventListener('pointerdown', handlePointerDown, true);
        };
    }, [isNodePickerOpen]);

    const handleAddNode = useCallback(() => {
        setIsNodePickerOpen((currentValue) => !currentValue);
    }, []);

    const handleNodeTemplateSelect = useCallback((templateId: WorkflowNodeTemplate['id']) => {
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
                    data: buildNodeData(templateId),
                },
            ];
        });
        setIsNodePickerOpen(false);
    }, [setNodes, workflow.id]);

    const handleConnect = useCallback((connection: Connection) => {
        setEdges((currentEdges) => addEdge({
            ...connection,
            markerEnd: {type: MarkerType.ArrowClosed},
        }, currentEdges));
    }, [setEdges]);

    return (
        <div className="flex h-full flex-1 min-h-0 overflow-hidden bg-background">
            <Canvas
                className="h-full w-full"
                connectOnClick
                edges={edges}
                fitViewOptions={{padding: 0.2}}
                nodeTypes={CANVAS_NODE_TYPES}
                nodesDraggable={interactionMode === 'pointer'}
                nodes={nodes}
                onConnect={handleConnect}
                onEdgesChange={onEdgesChange}
                onNodesChange={onNodesChange}
                panOnDrag={interactionMode === 'hand'}
                proOptions={{hideAttribution: true}}
                selectionOnDrag={interactionMode === 'pointer'}
            >
                <WorkflowCanvasToolbar
                    onAddNode={handleAddNode}
                    isNodePickerOpen={isNodePickerOpen}
                    interactionMode={interactionMode}
                    onInteractionModeChange={setInteractionMode}
                />
                {isNodePickerOpen ? <WorkflowNodePicker onSelect={handleNodeTemplateSelect} /> : null}
                <Controls showInteractive={false} />
            </Canvas>
        </div>
    );
}

export function WorkflowCanvas({workflow}: {workflow: WorkflowListItem}) {
    return <WorkflowCanvasContent key={workflow.id} workflow={workflow} />;
}
