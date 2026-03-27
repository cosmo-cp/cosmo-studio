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
import type {WorkflowListItem} from '@/components/workflow-history';
import {
    Bot,
    GitBranchPlus,
    Sparkles,
    Workflow,
} from 'lucide-react';
import {useMemo} from 'react';
import type {Edge, Node, NodeProps} from '@xyflow/react';
import {MarkerType} from '@xyflow/react';

type WorkflowCanvasNodeData = {
    description: string;
    icon: 'workflow' | 'agent' | 'result';
    title: string;
};

const WORKFLOW_CANVAS_NODE_TYPE = 'workflow-card';

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

export function WorkflowCanvas({workflow}: {workflow: WorkflowListItem}) {
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
                nodes={nodes}
                proOptions={{hideAttribution: true}}
            >
                <Panel position="top-left" className="px-3 py-2">
                    <div className="flex items-center gap-2">
                        <GitBranchPlus className="size-4 text-muted-foreground" />
                        <div className="min-w-0">
                            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                                Workflow Canvas
                            </p>
                            <p className="truncate text-sm font-medium">{workflow.title}</p>
                        </div>
                    </div>
                </Panel>
                <Controls showInteractive={false} />
            </Canvas>
        </div>
    );
}
