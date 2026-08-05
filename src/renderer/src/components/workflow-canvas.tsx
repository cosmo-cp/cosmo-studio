'use client';

import { Canvas } from '@/components/ai-elements/canvas';
import { Controls } from '@/components/ai-elements/controls';
import { Node as CanvasNodeCard } from '@/components/ai-elements/node';
import { Panel } from '@/components/ai-elements/panel';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { WorkflowListItem } from '@/components/workflow-history';
import { cn } from '@/lib/utils';
import type { Connection, Edge, Node, NodeProps, OnNodesChange, ReactFlowInstance, XYPosition } from '@xyflow/react';
import { addEdge, Handle, MarkerType, Position, useEdgesState, useNodesState } from '@xyflow/react';
import {
    Bot,
    CircleStop,
    GitBranch,
    Globe,
    GripHorizontal,
    Hand,
    MousePointer2,
    Play,
    PlugZap,
    Plus,
    Repeat,
    ShieldCheck,
    Sparkles,
    Tags,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

type InteractionMode = 'hand' | 'pointer';
type WorkflowNodeTemplateId = 'agent' | 'classify' | 'end' | 'http' | 'if-else' | 'loop' | 'mcp' | 'user-approval';
type WorkflowCanvasNodeTemplateId = WorkflowNodeTemplateId | 'start';
type WorkflowNodeGroupName = 'Core' | 'Logic' | 'Tools';
type WorkflowCanvasNodeIcon =
    | 'agent'
    | 'classify'
    | 'end'
    | 'http'
    | 'if-else'
    | 'loop'
    | 'mcp'
    | 'user-approval'
    | 'workflow';

type WorkflowCanvasNodeData = {
    description: string;
    icon: WorkflowCanvasNodeIcon;
    templateId: WorkflowCanvasNodeTemplateId;
    title: string;
    agentConfig?: {
        runtime: 'model' | 'agent';
        modelIdentifier?: string;
        agentId?: string | null;
        cwd?: string | null;
        prompt?: string;
        mcpServerIds?: string[];
    };
};

type WorkflowNodeTemplate = {
    description: string;
    group: WorkflowNodeGroupName;
    icon: WorkflowCanvasNodeIcon;
    id: WorkflowNodeTemplateId;
    title: string;
};
type NodePickerState =
    | { kind: 'toolbar' }
    | {
          anchor: XYPosition;
          kind: 'connection-drop';
          pendingConnection: {
              flowPosition: XYPosition;
              sourceHandle: string | null;
              sourceNodeId: string;
          };
      };

const WORKFLOW_CANVAS_NODE_TYPE = 'workflow-card';
const DEFAULT_TOOLBAR_OFFSET = {
    x: 0,
    y: 0,
};
const WORKFLOW_EDGE_STYLE = {
    strokeWidth: 1.5,
};
const NODE_CARD_HEIGHT = 42;
const NODE_CARD_WIDTH = 108;
const NODE_PICKER_MARGIN = 12;
const NODE_PICKER_SIZE = {
    height: 296,
    width: 236,
};
const WORKFLOW_NODE_GROUPS: { name: WorkflowNodeGroupName; nodes: WorkflowNodeTemplate[] }[] = [
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
    WORKFLOW_NODE_GROUPS.flatMap((group) => group.nodes).map((template) => [template.id, template]),
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
        agentConfig:
            template.id === 'agent'
                ? {
                      runtime: 'model',
                      modelIdentifier: '',
                      agentId: null,
                      cwd: null,
                      prompt: '',
                      mcpServerIds: [],
                  }
                : undefined,
    };
}

function buildInitialNodes(workflow: WorkflowListItem): Node<WorkflowCanvasNodeData>[] {
    return [
        {
            id: `${workflow.id}-start`,
            type: WORKFLOW_CANVAS_NODE_TYPE,
            position: { x: 64, y: 176 },
            deletable: false,
            data: buildWorkflowRootNodeData(workflow),
        },
        ...INITIAL_WORKFLOW_NODE_TEMPLATE_IDS.map((templateId, index) => ({
            id: `${workflow.id}-${templateId}`,
            type: WORKFLOW_CANVAS_NODE_TYPE,
            position: { x: 236 + index * 172, y: 176 },
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
            markerEnd: { type: MarkerType.ArrowClosed },
            style: WORKFLOW_EDGE_STYLE,
        },
        {
            id: `${workflow.id}-edge-2`,
            source: `${workflow.id}-agent`,
            target: `${workflow.id}-end`,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: WORKFLOW_EDGE_STYLE,
        },
    ];
}

export function getDropPickerAnchorPosition({
    clientX,
    clientY,
    containerRect,
}: {
    clientX: number;
    clientY: number;
    containerRect: DOMRect;
}): XYPosition {
    return {
        x: Math.min(
            Math.max(clientX - containerRect.left + NODE_PICKER_MARGIN, NODE_PICKER_MARGIN),
            Math.max(containerRect.width - NODE_PICKER_SIZE.width - NODE_PICKER_MARGIN, NODE_PICKER_MARGIN),
        ),
        y: Math.min(
            Math.max(clientY - containerRect.top, NODE_PICKER_MARGIN),
            Math.max(containerRect.height - NODE_PICKER_SIZE.height - NODE_PICKER_MARGIN, NODE_PICKER_MARGIN),
        ),
    };
}

export function getNodePositionFromDrop(flowPosition: XYPosition): XYPosition {
    return {
        x: Math.max(flowPosition.x - NODE_CARD_WIDTH / 2, 24),
        y: Math.max(flowPosition.y - NODE_CARD_HEIGHT / 2, 24),
    };
}

function getNodeIcon({
    icon,
    templateId,
    className,
}: {
    className: string;
    icon: WorkflowCanvasNodeIcon;
    templateId: WorkflowCanvasNodeTemplateId;
}) {
    if (templateId === 'start') {
        return <Play className={cn('stroke-[2.25] text-foreground', className)} />;
    }

    if (icon === 'agent') {
        return <Bot className={cn('text-foreground', className)} />;
    }

    if (icon === 'end') {
        return <CircleStop className={cn('text-foreground', className)} />;
    }

    if (icon === 'classify') {
        return <Tags className={cn('text-foreground', className)} />;
    }

    if (icon === 'if-else') {
        return <GitBranch className={cn('text-foreground', className)} />;
    }

    if (icon === 'loop') {
        return <Repeat className={cn('text-foreground', className)} />;
    }

    if (icon === 'user-approval') {
        return <ShieldCheck className={cn('text-foreground', className)} />;
    }

    if (icon === 'mcp') {
        return <PlugZap className={cn('text-foreground', className)} />;
    }

    if (icon === 'http') {
        return <Globe className={cn('text-foreground', className)} />;
    }

    return <Sparkles className={cn('text-foreground', className)} />;
}

function getNodePalette({
    icon,
    templateId,
}: {
    icon: WorkflowCanvasNodeIcon;
    templateId: WorkflowCanvasNodeTemplateId;
}) {
    if (templateId === 'start') {
        return {
            iconClassName: 'text-[#2d6758]',
            iconTileClassName: 'border-[#cfe3db] bg-white',
            surfaceClassName: 'border-[#d7e9e3] bg-[#dff2ec]',
        };
    }

    if (icon === 'agent') {
        return {
            iconClassName: 'text-[#4957ad]',
            iconTileClassName: 'border-[#dde3fb] bg-white',
            surfaceClassName: 'border-[#dde4fb] bg-[#e9edff]',
        };
    }

    if (icon === 'classify') {
        return {
            iconClassName: 'text-[#d68a2f]',
            iconTileClassName: 'border-[#f5e3c6] bg-white',
            surfaceClassName: 'border-[#f6e4ca] bg-[#fff3df]',
        };
    }

    if (icon === 'end') {
        return {
            iconClassName: 'text-[#8c2f3c]',
            iconTileClassName: 'border-[#f1d8dd] bg-white',
            surfaceClassName: 'border-[#f0d7dd] bg-[#f9e6ea]',
        };
    }

    if (icon === 'if-else') {
        return {
            iconClassName: 'text-[#e58e2d]',
            iconTileClassName: 'border-[#f6e1c1] bg-white',
            surfaceClassName: 'border-[#f7e4c8] bg-[#fff1dc]',
        };
    }

    if (icon === 'loop') {
        return {
            iconClassName: 'text-[#5f59b8]',
            iconTileClassName: 'border-[#dfdbfb] bg-white',
            surfaceClassName: 'border-[#e1dcfb] bg-[#ece9ff]',
        };
    }

    if (icon === 'user-approval') {
        return {
            iconClassName: 'text-[#a04f8c]',
            iconTileClassName: 'border-[#f2d7ea] bg-white',
            surfaceClassName: 'border-[#f3dbec] bg-[#fbe7f4]',
        };
    }

    if (icon === 'mcp') {
        return {
            iconClassName: 'text-[#cc6a42]',
            iconTileClassName: 'border-[#f6ddcf] bg-white',
            surfaceClassName: 'border-[#f6dfd3] bg-[#feece5]',
        };
    }

    if (icon === 'http') {
        return {
            iconClassName: 'text-[#2f88a5]',
            iconTileClassName: 'border-[#d2ecf2] bg-white',
            surfaceClassName: 'border-[#d6edf3] bg-[#e4f7fb]',
        };
    }

    return {
        iconClassName: 'text-foreground',
        iconTileClassName: 'border-[#e6e6e6] bg-white',
        surfaceClassName: 'border-[#ececec] bg-white',
    };
}

function WorkflowCanvasNode({ data }: NodeProps<Node<WorkflowCanvasNodeData>>) {
    const hasTargetHandle = data.templateId !== 'start';
    const palette = getNodePalette(data);

    return (
        <CanvasNodeCard
            className={cn(
                'relative h-[42px] w-[108px] rounded-[1rem] border p-0 shadow-[0_8px_18px_rgba(173,181,205,0.22)]',
                palette.surfaceClassName,
            )}
            handles={{ target: false, source: false }}
        >
            {hasTargetHandle ? (
                <Handle
                    aria-label={`${data.title} end connection`}
                    className={cn(
                        '!left-0 !size-3 !-translate-x-1/2 !rounded-full !border-2 !border-primary !bg-background shadow-sm',
                    )}
                    position={Position.Left}
                    type="target"
                />
            ) : null}
            <Handle
                aria-label={`${data.title} start connection`}
                className={cn(
                    '!right-0 !size-3 !translate-x-1/2 !rounded-full !border-2 !border-background !bg-primary !text-primary-foreground shadow-sm',
                    "after:absolute after:inset-0 after:flex after:items-center after:justify-center after:text-[8px] after:font-semibold after:text-primary-foreground after:content-['+']",
                )}
                position={Position.Right}
                type="source"
            />
            <div className="flex h-full items-center gap-2 px-2 py-1.5">
                <div
                    className={cn(
                        'flex size-[30px] shrink-0 items-center justify-center rounded-[0.75rem] border shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]',
                        palette.iconTileClassName,
                    )}
                >
                    {getNodeIcon({
                        ...data,
                        className: cn(data.templateId === 'start' ? 'size-[13px]' : 'size-3.5', palette.iconClassName),
                    })}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.74rem] leading-none font-medium tracking-[-0.04em] text-foreground">
                        {data.title}
                    </p>
                </div>
            </div>
        </CanvasNodeCard>
    );
}

function WorkflowNodePicker({
    anchor,
    onSelect,
}: {
    anchor?: XYPosition;
    onSelect: (templateId: WorkflowNodeTemplate['id']) => void;
}) {
    return (
        <Panel
            className="m-0 border-0 bg-transparent p-0 shadow-none"
            data-testid="workflow-node-picker-panel"
            position="top-left"
            style={
                anchor
                    ? {
                          left: `${anchor.x}px`,
                          top: `${anchor.y}px`,
                      }
                    : {
                          left: '72px',
                          top: '50%',
                          transform: 'translate(0px, -50%)',
                      }
            }
        >
            <TooltipProvider>
                <Card
                    aria-label="Workflow node picker"
                    className="max-w-[calc(100vw-120px)] gap-0 overflow-hidden border bg-background py-2 shadow-sm"
                    data-node-picker-surface="true"
                    data-testid="workflow-node-picker"
                    id="workflow-node-picker"
                    role="dialog"
                    style={{ width: 'min(236px, calc(100vw - 120px))' }}
                >
                    {WORKFLOW_NODE_GROUPS.map((group, groupIndex) => (
                        <div className={cn(groupIndex > 0 ? 'pt-3' : '')} key={group.name}>
                            <div className="px-3 pb-1 pt-1">
                                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                                    {group.name}
                                </p>
                            </div>
                            <div className="space-y-1 px-2 pb-1">
                                {group.nodes.map((template) => (
                                    <Tooltip key={template.id}>
                                        <TooltipTrigger asChild>
                                            <Button
                                                className={cn(
                                                    'h-[42px] w-full justify-start rounded-[1rem] border px-2 py-1.5 shadow-none hover:opacity-100 hover:bg-transparent',
                                                    getNodePalette({ icon: template.icon, templateId: template.id })
                                                        .surfaceClassName,
                                                )}
                                                onClick={() => onSelect(template.id)}
                                                variant="ghost"
                                            >
                                                <span
                                                    className={cn(
                                                        'flex size-[30px] shrink-0 items-center justify-center rounded-[0.75rem] border shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]',
                                                        getNodePalette({ icon: template.icon, templateId: template.id })
                                                            .iconTileClassName,
                                                    )}
                                                >
                                                    {getNodeIcon({
                                                        icon: template.icon,
                                                        templateId: template.id,
                                                        className: cn(
                                                            'size-[13px]',
                                                            getNodePalette({
                                                                icon: template.icon,
                                                                templateId: template.id,
                                                            }).iconClassName,
                                                        ),
                                                    })}
                                                </span>
                                                <span className="truncate text-[0.74rem] font-medium tracking-[-0.04em] text-foreground">
                                                    {template.title}
                                                </span>
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="right">
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
                        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
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
                        <TooltipContent side="right">
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
                        <TooltipContent side="right">
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
                        <TooltipContent side="right">
                            <p>Hand mode</p>
                        </TooltipContent>
                    </Tooltip>
                </div>
            </TooltipProvider>
        </Panel>
    );
}

function WorkflowCanvasContent({
    workflow,
    editable = true,
    onGraphChange,
}: {
    workflow: WorkflowListItem;
    editable?: boolean;
    onGraphChange?: (graph: { nodes: Record<string, unknown>[]; edges: Record<string, unknown>[] }) => void;
}) {
    const canvasRef = useRef<HTMLDivElement | null>(null);
    const reactFlowInstanceRef = useRef<ReactFlowInstance | null>(null);
    const [interactionMode, setInteractionMode] = useState<InteractionMode>('pointer');
    const [nodePickerState, setNodePickerState] = useState<NodePickerState | null>(null);
    const [nodes, setNodes, onNodesChange] = useNodesState<Node<WorkflowCanvasNodeData>>(buildInitialNodes(workflow));
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(buildInitialEdges(workflow));
    const nextNodeIndexRef = useRef(1);
    const isNodePickerOpen = nodePickerState !== null;

    useEffect(() => {
        if (!onGraphChange) {
            return;
        }

        onGraphChange({
            nodes: nodes as unknown as Record<string, unknown>[],
            edges: edges as unknown as Record<string, unknown>[],
        });
    }, [edges, nodes, onGraphChange]);

    useEffect(() => {
        if (!editable || !isNodePickerOpen) {
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

            setNodePickerState(null);
        };

        document.addEventListener('pointerdown', handlePointerDown, true);

        return () => {
            document.removeEventListener('pointerdown', handlePointerDown, true);
        };
    }, [editable, isNodePickerOpen]);

    useEffect(() => {
        if (editable) {
            return;
        }

        const closePickerTimer = window.setTimeout(() => {
            setNodePickerState(null);
        }, 0);

        return () => {
            window.clearTimeout(closePickerTimer);
        };
    }, [editable]);

    const handleAddNode = useCallback(() => {
        if (!editable) {
            return;
        }

        setNodePickerState((currentValue) => (currentValue ? null : { kind: 'toolbar' }));
    }, [editable]);

    const handleNodeTemplateSelect = useCallback(
        (templateId: WorkflowNodeTemplate['id']) => {
            const newNodeIndex = nextNodeIndexRef.current;
            nextNodeIndexRef.current += 1;
            const pickerState = nodePickerState;
            const newNodeId = `${workflow.id}-custom-${newNodeIndex}`;

            setNodes((currentNodes) => {
                const newNodePosition =
                    pickerState?.kind === 'connection-drop'
                        ? getNodePositionFromDrop(pickerState.pendingConnection.flowPosition)
                        : (() => {
                              const additionalNodeCount = currentNodes.filter((node) =>
                                  node.id.includes('-custom-'),
                              ).length;
                              const column = additionalNodeCount % 3;
                              const row = Math.floor(additionalNodeCount / 3);

                              return {
                                  x: 140 + column * 172,
                                  y: 292 + row * 108,
                              };
                          })();

                return [
                    ...currentNodes,
                    {
                        id: newNodeId,
                        type: WORKFLOW_CANVAS_NODE_TYPE,
                        position: newNodePosition,
                        data: buildNodeData(templateId),
                    },
                ];
            });

            if (pickerState?.kind === 'connection-drop') {
                setEdges((currentEdges) =>
                    addEdge(
                        {
                            source: pickerState.pendingConnection.sourceNodeId,
                            sourceHandle: pickerState.pendingConnection.sourceHandle,
                            target: newNodeId,
                            targetHandle: null,
                            markerEnd: { type: MarkerType.ArrowClosed },
                            style: WORKFLOW_EDGE_STYLE,
                        },
                        currentEdges,
                    ),
                );
            }

            setNodePickerState(null);
        },
        [nodePickerState, setEdges, setNodes, workflow.id],
    );

    const handleConnect = useCallback(
        (connection: Connection) => {
            setEdges((currentEdges) =>
                addEdge(
                    {
                        ...connection,
                        markerEnd: { type: MarkerType.ArrowClosed },
                        style: WORKFLOW_EDGE_STYLE,
                    },
                    currentEdges,
                ),
            );
        },
        [setEdges],
    );

    const handleConnectStart = useCallback(() => {
        setNodePickerState(null);
    }, []);

    const handleConnectEnd = useCallback(
        (
            event: MouseEvent | TouchEvent,
            connectionState: {
                fromHandle: { id?: string | null } | null;
                fromNode: { id: string } | null;
                isValid: boolean | null;
                pointer: XYPosition | null;
                toHandle: unknown;
                toNode: unknown;
            },
        ) => {
            if (
                connectionState.isValid ||
                !connectionState.fromNode ||
                connectionState.toNode ||
                connectionState.toHandle
            ) {
                return;
            }

            const flowInstance = reactFlowInstanceRef.current;
            const canvasElement = canvasRef.current;
            const clientPosition =
                'changedTouches' in event
                    ? event.changedTouches[0]
                        ? { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY }
                        : null
                    : { x: event.clientX, y: event.clientY };

            if (!flowInstance || !canvasElement || !clientPosition) {
                return;
            }

            const anchor = getDropPickerAnchorPosition({
                clientX: clientPosition.x,
                clientY: clientPosition.y,
                containerRect: canvasElement.getBoundingClientRect(),
            });

            setNodePickerState({
                kind: 'connection-drop',
                anchor,
                pendingConnection: {
                    sourceNodeId: connectionState.fromNode.id,
                    sourceHandle: connectionState.fromHandle?.id ?? null,
                    flowPosition: flowInstance.screenToFlowPosition(clientPosition),
                },
            });
        },
        [],
    );

    return (
        <div className="flex h-full flex-1 min-h-0 overflow-hidden bg-background" ref={canvasRef}>
            <Canvas
                className="h-full w-full"
                connectOnClick={editable}
                deleteKeyCode={editable ? ['Backspace', 'Delete'] : null}
                edges={edges}
                elementsSelectable={editable}
                fitViewOptions={{ padding: 0.2 }}
                nodeTypes={CANVAS_NODE_TYPES}
                nodesConnectable={editable}
                nodesDraggable={editable && interactionMode === 'pointer'}
                nodes={nodes}
                onConnect={editable ? handleConnect : undefined}
                onConnectEnd={editable ? handleConnectEnd : undefined}
                onConnectStart={editable ? handleConnectStart : undefined}
                onEdgesChange={onEdgesChange}
                onInit={(instance) => {
                    reactFlowInstanceRef.current = instance;
                }}
                onNodesChange={onNodesChange as OnNodesChange<Node>}
                panOnDrag={editable ? interactionMode === 'hand' : true}
                proOptions={{ hideAttribution: true }}
                selectionOnDrag={editable && interactionMode === 'pointer'}
            >
                {editable ? (
                    <WorkflowCanvasToolbar
                        onAddNode={handleAddNode}
                        isNodePickerOpen={isNodePickerOpen}
                        interactionMode={interactionMode}
                        onInteractionModeChange={setInteractionMode}
                    />
                ) : null}
                {editable && isNodePickerOpen ? (
                    <WorkflowNodePicker
                        anchor={nodePickerState?.kind === 'connection-drop' ? nodePickerState.anchor : undefined}
                        onSelect={handleNodeTemplateSelect}
                    />
                ) : null}
                <Controls showInteractive={false} />
            </Canvas>
        </div>
    );
}

export function WorkflowCanvas({
    workflow,
    editable = true,
    onGraphChange,
}: {
    workflow: WorkflowListItem;
    editable?: boolean;
    onGraphChange?: (graph: { nodes: Record<string, unknown>[]; edges: Record<string, unknown>[] }) => void;
}) {
    return (
        <WorkflowCanvasContent
            editable={editable}
            key={workflow.id}
            onGraphChange={onGraphChange}
            workflow={workflow}
        />
    );
}
