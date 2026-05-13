import {
    generateText,
    stepCountIs,
    type ModelMessage,
    type ToolSet,
} from 'ai';
import { inject, injectable } from 'inversify';
import type { WorkflowGraph, WorkflowRun } from 'core/dto';
import { McpClientManager } from 'core/services/McpClientManager';
import { ModelProviderService } from 'core/services/ModelProviderService';
import { WorkflowRunService } from 'core/services/WorkflowRunService';
import { CORETYPES } from 'core/types/types';
import { logger } from '../logger';

const EXECUTABLE_NODE_TYPES = [
    'agent',
    'if-else',
    'loop',
    'http',
    'mcp',
    'user-approval',
    'end',
] as const;

const PSEUDO_NODE_TYPES = ['start'] as const;
const ALL_NODE_TYPES = [...EXECUTABLE_NODE_TYPES, ...PSEUDO_NODE_TYPES] as const;
const DEFAULT_LOOP_LIMIT = 1;
const MAX_LOOP_LIMIT = 100;

type WorkflowExecutableNodeType = typeof EXECUTABLE_NODE_TYPES[number];
type WorkflowPseudoNodeType = typeof PSEUDO_NODE_TYPES[number];
type WorkflowNodeType = WorkflowExecutableNodeType | WorkflowPseudoNodeType;
type WorkflowRunStatus = WorkflowRun['status'];
type WorkflowProgressType =
    | 'run_status'
    | 'step_started'
    | 'step_progress'
    | 'step_completed'
    | 'step_waiting_approval'
    | 'step_failed';

export interface WorkflowProgressEvent {
    runId: string;
    type: WorkflowProgressType;
    status?: WorkflowRunStatus;
    nodeId?: string;
    nodeType?: WorkflowNodeType;
    message: string;
    payload?: Record<string, unknown>;
    createdAt: Date;
}

export interface WorkflowExecutionOptions {
    runId: string;
    graph: WorkflowGraph;
    input?: unknown;
    defaultModelIdentifier?: string;
    signal?: AbortSignal;
}

export interface WorkflowExecutionResult {
    runId: string;
    status: WorkflowRunStatus;
    outputs: Record<string, unknown>;
    visitedNodeIds: string[];
    waitingApproval?: {
        nodeId: string;
        prompt: string;
    };
}

export interface WorkflowExecutionContext {
    runId: string;
    input: unknown;
    defaultModelIdentifier?: string;
    signal: AbortSignal;
    outputs: Record<string, unknown>;
    lastOutput?: unknown;
}

export interface WorkflowStepResult {
    status: 'completed' | 'waiting_approval';
    output?: unknown;
    branch?: 'true' | 'false';
    waitingApproval?: {
        nodeId: string;
        prompt: string;
    };
}

export interface WorkflowExecutionStep {
    id: string;
    type: WorkflowExecutableNodeType;
    title?: string;
    execute: (context: WorkflowExecutionContext) => Promise<WorkflowStepResult>;
}

export interface CompiledWorkflow {
    entryNodeId: string;
    steps: WorkflowExecutionStep[];
    orderedNodeIds: string[];
}

interface NormalizedWorkflowNode {
    id: string;
    type: WorkflowNodeType;
    title?: string;
    config: Record<string, unknown>;
}

interface NormalizedWorkflowEdge {
    id: string;
    source: string;
    target: string;
    branch?: string;
}

interface WorkflowExecutionPlan {
    entryNodeId: string;
    nodesById: Map<string, NormalizedWorkflowNode>;
    orderedNodes: NormalizedWorkflowNode[];
    outgoingEdgesByNodeId: Map<string, NormalizedWorkflowEdge[]>;
}

interface ExecutableTool {
    execute: (
        input: unknown,
        options: Record<string, unknown>
    ) => Promise<unknown> | unknown;
}

type WorkflowProgressListener = (event: WorkflowProgressEvent) => void;

@injectable()
export class WorkflowExecutionService {
    private readonly activeRunControllers = new Map<string, AbortController>();
    private readonly progressListeners = new Map<string, Set<WorkflowProgressListener>>();

    constructor(
        @inject(CORETYPES.WorkflowRunService)
        private readonly workflowRunService: WorkflowRunService,
        @inject(CORETYPES.ModelProviderService)
        private readonly modelProviderService: ModelProviderService,
        @inject(CORETYPES.McpClientManager)
        private readonly mcpClientManager: McpClientManager,
    ) {}

    // Builds a durable-step execution plan that callers can inspect before running.
    public compileGraph(graph: WorkflowGraph): CompiledWorkflow {
        const plan = this.createExecutionPlan(graph);
        const steps = plan.orderedNodes
            .filter((node): node is NormalizedWorkflowNode & { type: WorkflowExecutableNodeType } =>
                this.isExecutableNodeType(node.type),
            )
            .map((node) => ({
                id: node.id,
                type: node.type,
                title: node.title,
                execute: (context: WorkflowExecutionContext) => this.executeNode(node, context),
            }));

        return {
            entryNodeId: plan.entryNodeId,
            steps,
            orderedNodeIds: plan.orderedNodes.map((node) => node.id),
        };
    }

    // Executes a persisted run while mirroring lifecycle and step events to storage and listeners.
    public async executeRun(options: WorkflowExecutionOptions): Promise<WorkflowExecutionResult> {
        'use workflow';

        const plan = this.createExecutionPlan(options.graph);
        const runController = new AbortController();
        const cleanupSignal = this.bindExternalSignal(runController, options.signal);
        this.activeRunControllers.set(options.runId, runController);

        const context: WorkflowExecutionContext = {
            runId: options.runId,
            input: options.input,
            defaultModelIdentifier: options.defaultModelIdentifier,
            signal: runController.signal,
            outputs: {},
        };
        const visitedNodeIds: string[] = [];
        const activeNodeIds = new Set<string>([plan.entryNodeId]);

        try {
            await this.transitionRun(options.runId, 'running', 'Workflow execution started');

            for (const node of plan.orderedNodes) {
                if (!activeNodeIds.has(node.id)) {
                    continue;
                }

                this.throwIfCancelled(context);

                if (node.type === 'start') {
                    this.activateNextNodes(plan, node, undefined, activeNodeIds);
                    continue;
                }

                visitedNodeIds.push(node.id);
                const result = await this.executeStep(node, context);
                context.outputs[node.id] = this.toJsonSafeValue(result.output);
                context.lastOutput = result.output;

                if (result.status === 'waiting_approval' && result.waitingApproval) {
                    await this.transitionRun(
                        options.runId,
                        'waiting_approval',
                        'Workflow is waiting for user approval',
                    );
                    return {
                        runId: options.runId,
                        status: 'waiting_approval',
                        outputs: context.outputs,
                        visitedNodeIds,
                        waitingApproval: result.waitingApproval,
                    };
                }

                if (node.type === 'end') {
                    await this.transitionRun(options.runId, 'completed', 'Workflow execution completed');
                    return {
                        runId: options.runId,
                        status: 'completed',
                        outputs: context.outputs,
                        visitedNodeIds,
                    };
                }

                this.activateNextNodes(plan, node, result, activeNodeIds);
            }

            await this.transitionRun(options.runId, 'completed', 'Workflow execution completed');
            return {
                runId: options.runId,
                status: 'completed',
                outputs: context.outputs,
                visitedNodeIds,
            };
        } catch (error) {
            if (runController.signal.aborted || this.isAbortError(error)) {
                await this.transitionRun(options.runId, 'cancelled', 'Workflow execution cancelled');
                return {
                    runId: options.runId,
                    status: 'cancelled',
                    outputs: context.outputs,
                    visitedNodeIds,
                };
            }

            const message = this.getErrorMessage(error);
            await this.transitionRun(options.runId, 'failed', message);
            throw error;
        } finally {
            cleanupSignal();
            this.activeRunControllers.delete(options.runId);
        }
    }

    // Cancels in-process execution and persists the terminal run state for external callers.
    public async cancelRun(runId: string, message = 'Workflow execution cancelled'): Promise<WorkflowRun | undefined> {
        const controller = this.activeRunControllers.get(runId);
        controller?.abort();
        const run = await this.workflowRunService.cancelRun(runId, message);
        this.emitProgress({
            runId,
            type: 'run_status',
            status: 'cancelled',
            message,
            createdAt: new Date(),
        });
        return run;
    }

    // Lets IPC/SSE adapters bridge executor events without coupling the service to a transport.
    public subscribeToProgress(runId: string, listener: WorkflowProgressListener): () => void {
        let listeners = this.progressListeners.get(runId);
        if (!listeners) {
            listeners = new Set<WorkflowProgressListener>();
            this.progressListeners.set(runId, listeners);
        }
        listeners.add(listener);

        return () => {
            const currentListeners = this.progressListeners.get(runId);
            currentListeners?.delete(listener);
            if (currentListeners?.size === 0) {
                this.progressListeners.delete(runId);
            }
        };
    }

    // Provides a Web Stream facade for HTTP streaming consumers.
    public createProgressStream(runId: string): ReadableStream<WorkflowProgressEvent> {
        return new ReadableStream<WorkflowProgressEvent>({
            start: (controller) => {
                let unsubscribe = () => {};
                unsubscribe = this.subscribeToProgress(runId, (event) => {
                    controller.enqueue(event);
                    const isTerminalRunStatus = event.type === 'run_status'
                        && ['completed', 'failed', 'cancelled'].includes(event.status ?? '');
                    if (isTerminalRunStatus) {
                        controller.close();
                        unsubscribe();
                    }
                });
            },
        });
    }

    // Validates the graph shape, node support, references, and DAG ordering.
    private createExecutionPlan(graph: WorkflowGraph): WorkflowExecutionPlan {
        if (!Array.isArray(graph.nodes) || graph.nodes.length === 0) {
            throw new Error('Workflow graph must contain at least one node');
        }

        const nodes = graph.nodes.map((node, index) => this.normalizeNode(node, index));
        const nodesById = new Map<string, NormalizedWorkflowNode>();
        for (const node of nodes) {
            if (nodesById.has(node.id)) {
                throw new Error(`Duplicate workflow node id: ${node.id}`);
            }
            nodesById.set(node.id, node);
        }

        const edges = graph.edges.map((edge, index) => this.normalizeEdge(edge, index, nodesById));
        const outgoingEdgesByNodeId = this.groupOutgoingEdges(edges);
        const orderedNodeIds = this.topologicalSort(nodes, edges);
        const entryNodeId = this.findEntryNode(nodes, edges, outgoingEdgesByNodeId);

        return {
            entryNodeId,
            nodesById,
            orderedNodes: orderedNodeIds.map((nodeId) => nodesById.get(nodeId)!),
            outgoingEdgesByNodeId,
        };
    }

    // Converts loose stored node JSON into the subset the executor can safely run.
    private normalizeNode(nodeValue: Record<string, unknown>, index: number): NormalizedWorkflowNode {
        if (!this.isRecord(nodeValue)) {
            throw new Error(`Workflow node at index ${index} must be an object`);
        }

        const id = this.getString(nodeValue.id);
        if (!id) {
            throw new Error(`Workflow node at index ${index} is missing an id`);
        }

        const data = this.isRecord(nodeValue.data) ? nodeValue.data : {};
        const rawType = this.getString(data.templateId)
            ?? this.getString(data.nodeType)
            ?? this.getString(nodeValue.nodeType)
            ?? this.getString(nodeValue.kind)
            ?? this.getString(nodeValue.type);
        const type = rawType?.toLowerCase();

        if (!this.isSupportedNodeType(type)) {
            throw new Error(`Unsupported workflow node type "${rawType ?? 'unknown'}" for node ${id}`);
        }

        return {
            id,
            type,
            title: this.getString(data.title) ?? this.getString(nodeValue.title),
            config: this.extractNodeConfig(nodeValue, data),
        };
    }

    // Converts loose stored edge JSON into a typed connection between validated nodes.
    private normalizeEdge(
        edgeValue: Record<string, unknown>,
        index: number,
        nodesById: Map<string, NormalizedWorkflowNode>,
    ): NormalizedWorkflowEdge {
        if (!this.isRecord(edgeValue)) {
            throw new Error(`Workflow edge at index ${index} must be an object`);
        }

        const source = this.getString(edgeValue.source);
        const target = this.getString(edgeValue.target);
        if (!source || !target) {
            throw new Error(`Workflow edge at index ${index} must include source and target`);
        }
        if (!nodesById.has(source)) {
            throw new Error(`Workflow edge ${index} references missing source node ${source}`);
        }
        if (!nodesById.has(target)) {
            throw new Error(`Workflow edge ${index} references missing target node ${target}`);
        }

        const edgeData = this.isRecord(edgeValue.data) ? edgeValue.data : {};
        const branch = this.normalizeBranchLabel(
            this.getString(edgeValue.sourceHandle)
                ?? this.getString(edgeData.branch)
                ?? this.getString(edgeData.condition)
                ?? this.getString(edgeValue.label),
        );

        return {
            id: this.getString(edgeValue.id) ?? `edge-${index}`,
            source,
            target,
            branch,
        };
    }

    // Keeps configurable node data while excluding canvas-only metadata.
    private extractNodeConfig(
        nodeValue: Record<string, unknown>,
        data: Record<string, unknown>,
    ): Record<string, unknown> {
        const config: Record<string, unknown> = {};
        const copyConfig = (source: Record<string, unknown>) => {
            for (const [key, value] of Object.entries(source)) {
                if (!['id', 'type', 'nodeType', 'templateId', 'icon', 'title', 'description'].includes(key)) {
                    config[key] = value;
                }
            }
        };

        copyConfig(data);
        copyConfig(nodeValue);
        if (this.isRecord(nodeValue.config)) copyConfig(nodeValue.config);
        if (this.isRecord(data.config)) copyConfig(data.config);
        if (this.isRecord(data.settings)) copyConfig(data.settings);
        return config;
    }

    // Builds adjacency lists without losing the original edge order used for fallback branching.
    private groupOutgoingEdges(edges: NormalizedWorkflowEdge[]): Map<string, NormalizedWorkflowEdge[]> {
        const grouped = new Map<string, NormalizedWorkflowEdge[]>();
        for (const edge of edges) {
            const nodeEdges = grouped.get(edge.source) ?? [];
            nodeEdges.push(edge);
            grouped.set(edge.source, nodeEdges);
        }
        return grouped;
    }

    // Rejects cycles so replayable execution order stays deterministic.
    private topologicalSort(
        nodes: NormalizedWorkflowNode[],
        edges: NormalizedWorkflowEdge[],
    ): string[] {
        const indegree = new Map<string, number>();
        const outgoing = new Map<string, string[]>();
        for (const node of nodes) {
            indegree.set(node.id, 0);
            outgoing.set(node.id, []);
        }
        for (const edge of edges) {
            indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
            outgoing.get(edge.source)?.push(edge.target);
        }

        const queue = nodes.filter((node) => (indegree.get(node.id) ?? 0) === 0).map((node) => node.id);
        const orderedNodeIds: string[] = [];

        while (queue.length > 0) {
            const nodeId = queue.shift()!;
            orderedNodeIds.push(nodeId);
            for (const targetId of outgoing.get(nodeId) ?? []) {
                const nextIndegree = (indegree.get(targetId) ?? 0) - 1;
                indegree.set(targetId, nextIndegree);
                if (nextIndegree === 0) {
                    queue.push(targetId);
                }
            }
        }

        if (orderedNodeIds.length !== nodes.length) {
            throw new Error('Workflow graph must be a DAG; cycle detected');
        }

        return orderedNodeIds;
    }

    // Selects the single entry point used to seed execution.
    private findEntryNode(
        nodes: NormalizedWorkflowNode[],
        edges: NormalizedWorkflowEdge[],
        outgoingEdgesByNodeId: Map<string, NormalizedWorkflowEdge[]>,
    ): string {
        const startNodes = nodes.filter((node) => node.type === 'start');
        if (startNodes.length > 1) {
            throw new Error('Workflow graph must contain at most one start node');
        }
        if (startNodes.length === 1) {
            if ((outgoingEdgesByNodeId.get(startNodes[0].id) ?? []).length === 0) {
                throw new Error('Workflow start node must connect to at least one executable node');
            }
            return startNodes[0].id;
        }

        const targets = new Set(edges.map((edge) => edge.target));
        const roots = nodes.filter((node) => !targets.has(node.id));
        if (roots.length !== 1) {
            throw new Error('Workflow graph must contain exactly one entry node');
        }
        return roots[0].id;
    }

    // Wraps node execution with durable-step style logging and progress emission.
    private async executeStep(
        node: NormalizedWorkflowNode,
        context: WorkflowExecutionContext,
    ): Promise<WorkflowStepResult> {
        await this.recordStepEvent(context.runId, node, 'step_started', `Started ${node.type} step`);

        try {
            const result = await this.executeNode(node, context);
            if (result.status === 'waiting_approval') {
                await this.recordStepEvent(
                    context.runId,
                    node,
                    'step_waiting_approval',
                    'Step is waiting for user approval',
                    result.waitingApproval,
                    'waiting_approval',
                );
                return result;
            }

            await this.recordStepEvent(
                context.runId,
                node,
                'step_completed',
                `Completed ${node.type} step`,
                { output: this.toJsonSafeValue(result.output) },
            );
            return result;
        } catch (error) {
            await this.recordStepEvent(
                context.runId,
                node,
                'step_failed',
                this.getErrorMessage(error),
                { error: this.getErrorMessage(error) },
                'failed',
            );
            throw error;
        }
    }

    // Dispatches supported node kinds to their WDK-compatible step functions.
    private async executeNode(
        node: NormalizedWorkflowNode,
        context: WorkflowExecutionContext,
    ): Promise<WorkflowStepResult> {
        switch (node.type) {
            case 'agent':
                return this.executeAgentNode(node, context);
            case 'if-else':
                return this.executeIfElseNode(node, context);
            case 'loop':
                return this.executeLoopNode(node, context);
            case 'http':
                return this.executeHttpNode(node, context);
            case 'mcp':
                return this.executeMcpNode(node, context);
            case 'user-approval':
                return this.executeUserApprovalNode(node);
            case 'end':
                return this.executeEndNode(context);
            case 'start':
                return { status: 'completed' };
            default:
                throw new Error(`Unsupported workflow node type: ${node.type satisfies never}`);
        }
    }

    // Runs LLM work through the same provider registry used by chat.
    private async executeAgentNode(
        node: NormalizedWorkflowNode,
        context: WorkflowExecutionContext,
    ): Promise<WorkflowStepResult> {
        'use step';

        const modelIdentifier = this.getConfigString(node, ['modelIdentifier', 'modelId', 'model'])
            ?? context.defaultModelIdentifier;
        if (!modelIdentifier) {
            throw new Error(`Agent node ${node.id} requires a modelIdentifier`);
        }

        const promptTemplate = this.getConfigString(node, ['prompt', 'input', 'message'])
            ?? this.valueToPrompt(context.input);
        if (!promptTemplate) {
            throw new Error(`Agent node ${node.id} requires a prompt or workflow input`);
        }

        const registry = await this.modelProviderService.getModelProviderRegistry();
        const tools = await this.buildAgentTools(node);
        const hasTools = Object.keys(tools).length > 0;
        const systemPrompt = this.getConfigString(node, ['systemPrompt', 'instructions']);
        const messages: ModelMessage[] = [];
        if (systemPrompt) {
            messages.push({ role: 'system', content: this.renderTemplate(systemPrompt, context) });
        }
        messages.push({
            role: 'user',
            content: this.renderTemplate(promptTemplate, context),
        });

        const result = await generateText({
            // @ts-expect-error/type-does-not-exist
            model: registry.languageModel(modelIdentifier),
            messages,
            tools,
            stopWhen: hasTools ? stepCountIs(5) : undefined,
            abortSignal: context.signal,
        });

        return {
            status: 'completed',
            output: {
                text: result.text,
                finishReason: result.finishReason,
            },
        };
    }

    // Evaluates deterministic branch conditions without executing arbitrary user code.
    private async executeIfElseNode(
        node: NormalizedWorkflowNode,
        context: WorkflowExecutionContext,
    ): Promise<WorkflowStepResult> {
        'use step';

        const decision = this.evaluateCondition(node, context);
        return {
            status: 'completed',
            branch: decision ? 'true' : 'false',
            output: { result: decision },
        };
    }

    // Represents repeated work as an observable step while keeping the graph itself acyclic.
    private async executeLoopNode(
        node: NormalizedWorkflowNode,
        context: WorkflowExecutionContext,
    ): Promise<WorkflowStepResult> {
        'use step';

        const explicitItems = this.getConfigArray(node, ['items']);
        const inferredItems = Array.isArray(context.lastOutput) ? context.lastOutput : undefined;
        const items = explicitItems ?? inferredItems;
        const configuredLimit = this.getConfigNumber(node, ['iterations', 'maxIterations']);
        const iterationCount = this.normalizeLoopIterations(configuredLimit, items?.length);

        for (let index = 0; index < iterationCount; index += 1) {
            this.throwIfCancelled(context);
            await this.recordStepEvent(
                context.runId,
                node,
                'step_progress',
                `Loop iteration ${index + 1} of ${iterationCount}`,
                { iteration: index + 1, totalIterations: iterationCount },
            );
        }

        return {
            status: 'completed',
            output: {
                iterations: iterationCount,
                items: this.toJsonSafeValue(items ?? []),
            },
        };
    }

    // Runs HTTP calls inside a cancellable step boundary.
    private async executeHttpNode(
        node: NormalizedWorkflowNode,
        context: WorkflowExecutionContext,
    ): Promise<WorkflowStepResult> {
        'use step';

        const url = this.getConfigString(node, ['url']);
        if (!url) {
            throw new Error(`HTTP node ${node.id} requires a url`);
        }

        const method = this.getConfigString(node, ['method'])?.toUpperCase() ?? 'GET';
        const headers = this.getConfigRecord(node, ['headers']) as Record<string, string> | undefined;
        const body = this.getConfigValue(node, ['body']);
        const response = await fetch(url, {
            method,
            headers,
            body: this.createHttpBody(body),
            signal: context.signal,
        });
        const responseText = await response.text();
        const output = {
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            body: this.parseResponseBody(responseText),
        };

        if (!response.ok && this.getConfigValue(node, ['allowFailure']) !== true) {
            throw new Error(`HTTP node ${node.id} failed with ${response.status} ${response.statusText}`);
        }

        return { status: 'completed', output };
    }

    // Executes an MCP tool exposed through the existing MCP client manager.
    private async executeMcpNode(
        node: NormalizedWorkflowNode,
        context: WorkflowExecutionContext,
    ): Promise<WorkflowStepResult> {
        'use step';

        const toolName = this.getConfigString(node, ['toolName', 'tool']);
        if (!toolName) {
            throw new Error(`MCP node ${node.id} requires a toolName`);
        }

        const tools = await this.mcpClientManager.getAllTools();
        const tool = tools[toolName] as unknown as Partial<ExecutableTool> | undefined;
        if (!tool?.execute) {
            throw new Error(`MCP tool "${toolName}" is not available`);
        }

        const input = this.getConfigValue(node, ['arguments', 'args', 'input']) ?? {};
        const output = await tool.execute(input, {
            toolCallId: `workflow-${context.runId}-${node.id}`,
            abortSignal: context.signal,
        });

        return {
            status: 'completed',
            output: this.toJsonSafeValue(output),
        };
    }

    // Pauses execution so a later controller can resume from a persisted approval decision.
    private async executeUserApprovalNode(node: NormalizedWorkflowNode): Promise<WorkflowStepResult> {
        'use step';

        const prompt = this.getConfigString(node, ['prompt', 'message'])
            ?? node.title
            ?? 'Approve workflow execution to continue';
        return {
            status: 'waiting_approval',
            output: { prompt, requestedAt: new Date().toISOString() },
            waitingApproval: { nodeId: node.id, prompt },
        };
    }

    // Terminates the active path and exposes the last computed value as the end output.
    private async executeEndNode(context: WorkflowExecutionContext): Promise<WorkflowStepResult> {
        'use step';

        return {
            status: 'completed',
            output: context.lastOutput,
        };
    }

    // Activates successor nodes, using branch labels when an if/else step produced a branch.
    private activateNextNodes(
        plan: WorkflowExecutionPlan,
        node: NormalizedWorkflowNode,
        result: WorkflowStepResult | undefined,
        activeNodeIds: Set<string>,
    ): void {
        const outgoingEdges = plan.outgoingEdgesByNodeId.get(node.id) ?? [];
        const selectedEdges = node.type === 'if-else'
            ? this.selectBranchEdges(outgoingEdges, result?.branch)
            : outgoingEdges;

        for (const edge of selectedEdges) {
            activeNodeIds.add(edge.target);
        }
    }

    // Chooses branch edges from explicit labels, falling back to stable edge order.
    private selectBranchEdges(
        outgoingEdges: NormalizedWorkflowEdge[],
        branch: 'true' | 'false' | undefined,
    ): NormalizedWorkflowEdge[] {
        if (!branch) {
            return [];
        }

        const matchingEdges = outgoingEdges.filter((edge) => edge.branch === branch);
        if (matchingEdges.length > 0) {
            return matchingEdges;
        }

        const fallbackLabels = branch === 'true' ? ['then', 'yes'] : ['else', 'no', 'default'];
        const fallbackEdges = outgoingEdges.filter((edge) => edge.branch && fallbackLabels.includes(edge.branch));
        if (fallbackEdges.length > 0) {
            return fallbackEdges;
        }

        if (outgoingEdges.length === 2) {
            return [branch === 'true' ? outgoingEdges[0] : outgoingEdges[1]];
        }

        return [];
    }

    // Keeps run status changes mirrored to both the database event log and live listeners.
    private async transitionRun(
        runId: string,
        status: WorkflowRunStatus,
        message: string,
    ): Promise<void> {
        await this.workflowRunService.updateRunStatus(runId, status, message);
        this.emitProgress({
            runId,
            type: 'run_status',
            status,
            message,
            createdAt: new Date(),
        });
    }

    // Persists detailed step events and emits the same shape to active stream consumers.
    private async recordStepEvent(
        runId: string,
        node: NormalizedWorkflowNode,
        type: WorkflowProgressType,
        message: string,
        payload?: Record<string, unknown>,
        status: WorkflowRunStatus = 'running',
    ): Promise<void> {
        const eventPayload = {
            nodeId: node.id,
            nodeType: node.type,
            ...payload,
        };
        await this.workflowRunService.recordProgressEvent(runId, message, eventPayload, status);
        this.emitProgress({
            runId,
            type,
            status,
            nodeId: node.id,
            nodeType: node.type,
            message,
            payload: eventPayload,
            createdAt: new Date(),
        });
    }

    // Fans progress events out to all listeners registered for this run.
    private emitProgress(event: WorkflowProgressEvent): void {
        const listeners = this.progressListeners.get(event.runId);
        if (!listeners) {
            return;
        }

        for (const listener of listeners) {
            try {
                listener(event);
            } catch (error) {
                logger.warn('Workflow progress listener failed', error);
            }
        }
    }

    // Uses existing MCP tool discovery when an agent node opts into tool access.
    private async buildAgentTools(node: NormalizedWorkflowNode): Promise<ToolSet> {
        if (this.getConfigValue(node, ['tools']) === false) {
            return {};
        }
        return this.mcpClientManager.getAllTools();
    }

    // Evaluates supported static condition shapes without eval.
    private evaluateCondition(node: NormalizedWorkflowNode, context: WorkflowExecutionContext): boolean {
        const condition = this.getConfigValue(node, ['condition', 'value']);
        if (typeof condition === 'boolean') {
            return condition;
        }
        if (typeof condition === 'string') {
            const normalized = condition.trim().toLowerCase();
            if (['true', 'yes', '1'].includes(normalized)) return true;
            if (['false', 'no', '0'].includes(normalized)) return false;
        }

        const equals = this.getConfigValue(node, ['equals']);
        if (equals !== undefined) {
            return this.stringifyValue(context.lastOutput ?? context.input) === this.stringifyValue(equals);
        }

        return Boolean(context.lastOutput ?? context.input);
    }

    // Converts user-provided loop limits into a bounded iteration count.
    private normalizeLoopIterations(configuredLimit?: number, itemCount?: number): number {
        const candidate = configuredLimit ?? itemCount ?? DEFAULT_LOOP_LIMIT;
        if (!Number.isFinite(candidate) || candidate < 0) {
            throw new Error('Loop iteration count must be a non-negative number');
        }
        return Math.min(Math.floor(candidate), MAX_LOOP_LIMIT);
    }

    // Renders simple workflow variables without exposing arbitrary code execution.
    private renderTemplate(template: string, context: WorkflowExecutionContext): string {
        return template.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_match, token: string) => {
            if (token === 'input') return this.stringifyValue(context.input);
            if (token === 'lastOutput') return this.stringifyValue(context.lastOutput);
            if (token.startsWith('outputs.')) {
                return this.stringifyValue(context.outputs[token.slice('outputs.'.length)]);
            }
            return '';
        });
    }

    // Forwards external aborts to the per-run controller and returns a cleanup callback.
    private bindExternalSignal(controller: AbortController, signal?: AbortSignal): () => void {
        if (!signal) {
            return () => {};
        }
        if (signal.aborted) {
            controller.abort(signal.reason);
            return () => {};
        }

        const abort = () => controller.abort(signal.reason);
        signal.addEventListener('abort', abort, { once: true });
        return () => signal.removeEventListener('abort', abort);
    }

    // Raises a normal AbortError when a node checks cancellation cooperatively.
    private throwIfCancelled(context: WorkflowExecutionContext): void {
        if (!context.signal.aborted) {
            return;
        }

        throw new DOMException('Workflow execution cancelled', 'AbortError');
    }

    // Converts arbitrary step output into a JSONB-safe value.
    private toJsonSafeValue(value: unknown): unknown {
        if (value === undefined) {
            return null;
        }

        try {
            return JSON.parse(JSON.stringify(value)) as unknown;
        } catch {
            return this.stringifyValue(value);
        }
    }

    // Creates a fetch body without accidentally sending JSON for empty values.
    private createHttpBody(value: unknown): BodyInit | undefined {
        if (value === undefined || value === null) {
            return undefined;
        }
        if (typeof value === 'string' || value instanceof URLSearchParams || value instanceof FormData) {
            return value;
        }
        return JSON.stringify(value);
    }

    // Parses JSON responses when possible while preserving non-JSON payloads.
    private parseResponseBody(value: string): unknown {
        if (!value) {
            return null;
        }
        try {
            return JSON.parse(value) as unknown;
        } catch {
            return value;
        }
    }

    // Extracts string config values from multiple accepted aliases.
    private getConfigString(node: NormalizedWorkflowNode, keys: string[]): string | undefined {
        const value = this.getConfigValue(node, keys);
        return this.getString(value);
    }

    // Extracts numeric config values from multiple accepted aliases.
    private getConfigNumber(node: NormalizedWorkflowNode, keys: string[]): number | undefined {
        const value = this.getConfigValue(node, keys);
        if (typeof value === 'number') {
            return value;
        }
        if (typeof value === 'string' && value.trim() !== '') {
            const parsed = Number(value);
            return Number.isNaN(parsed) ? undefined : parsed;
        }
        return undefined;
    }

    // Extracts array config values from multiple accepted aliases.
    private getConfigArray(node: NormalizedWorkflowNode, keys: string[]): unknown[] | undefined {
        const value = this.getConfigValue(node, keys);
        return Array.isArray(value) ? value : undefined;
    }

    // Extracts object config values from multiple accepted aliases.
    private getConfigRecord(
        node: NormalizedWorkflowNode,
        keys: string[],
    ): Record<string, unknown> | undefined {
        const value = this.getConfigValue(node, keys);
        return this.isRecord(value) ? value : undefined;
    }

    // Looks up the first configured alias with a defined value.
    private getConfigValue(node: NormalizedWorkflowNode, keys: string[]): unknown {
        for (const key of keys) {
            if (node.config[key] !== undefined) {
                return node.config[key];
            }
        }
        return undefined;
    }

    // Normalizes branch labels commonly emitted by graph canvases.
    private normalizeBranchLabel(label?: string): string | undefined {
        const normalized = label?.trim().toLowerCase();
        if (!normalized) {
            return undefined;
        }
        if (['true', 'then', 'yes'].includes(normalized)) return normalized === 'true' ? 'true' : normalized;
        if (['false', 'else', 'no', 'default'].includes(normalized)) {
            return normalized === 'false' ? 'false' : normalized;
        }
        return normalized;
    }

    // Distinguishes supported runtime node types from pseudo canvas nodes.
    private isExecutableNodeType(type: WorkflowNodeType): type is WorkflowExecutableNodeType {
        return (EXECUTABLE_NODE_TYPES as readonly string[]).includes(type);
    }

    // Validates string values against the supported node-type set.
    private isSupportedNodeType(type?: string): type is WorkflowNodeType {
        return !!type && (ALL_NODE_TYPES as readonly string[]).includes(type);
    }

    // Narrows unknown values to string.
    private getString(value: unknown): string | undefined {
        return typeof value === 'string' && value.trim() !== '' ? value : undefined;
    }

    // Narrows unknown values to JSON-like records.
    private isRecord(value: unknown): value is Record<string, unknown> {
        return typeof value === 'object' && value !== null && !Array.isArray(value);
    }

    // Creates stable text for prompts, comparisons, and fallback event payloads.
    private stringifyValue(value: unknown): string {
        if (value === undefined || value === null) {
            return '';
        }
        if (typeof value === 'string') {
            return value;
        }
        try {
            return JSON.stringify(value);
        } catch {
            return String(value);
        }
    }

    // Converts workflow input into a usable prompt when the node has no explicit prompt.
    private valueToPrompt(value: unknown): string | undefined {
        const prompt = this.stringifyValue(value);
        return prompt.trim() === '' ? undefined : prompt;
    }

    // Avoids assuming every cancellation source throws the same AbortError class.
    private isAbortError(error: unknown): boolean {
        return error instanceof DOMException && error.name === 'AbortError';
    }

    // Converts unknown caught values into concise persisted failure messages.
    private getErrorMessage(error: unknown): string {
        return error instanceof Error ? error.message : String(error);
    }
}
