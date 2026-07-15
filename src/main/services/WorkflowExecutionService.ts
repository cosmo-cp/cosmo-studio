import {generateText, stepCountIs, type ToolSet} from 'ai';
import {inject, injectable} from 'inversify';
import type {WorkflowGraph, WorkflowRun} from 'core/dto';
import {McpClientManager} from 'core/services/McpClientManager';
import {ModelProviderService} from 'core/services/ModelProviderService';
import {WorkflowRunService} from 'core/services/WorkflowRunService';
import {CORETYPES} from 'core/types/types';
import {logger} from '../logger';

const SUPPORTED_NODE_TYPES = new Set<WorkflowNodeType>([
    'start',
    'agent',
    'if-else',
    'loop',
    'http',
    'mcp',
    'user-approval',
    'end',
]);

export type WorkflowNodeType =
    | 'start'
    | 'agent'
    | 'if-else'
    | 'loop'
    | 'http'
    | 'mcp'
    | 'user-approval'
    | 'end';

export interface WorkflowExecutionOptions {
    runId: string;
    graph: WorkflowGraph;
    input?: unknown;
    signal?: AbortSignal;
}

export interface WorkflowExecutableStep {
    id: string;
    type: WorkflowNodeType;
    data: Record<string, unknown>;
}

export interface WorkflowEdge {
    id?: string;
    source: string;
    target: string;
    sourceHandle?: string;
}

export interface CompiledWorkflowGraph {
    entryNodeId: string;
    orderedNodeIds: string[];
    steps: WorkflowExecutableStep[];
    nodeById: Map<string, WorkflowExecutableStep>;
    outgoingEdges: Map<string, WorkflowEdge[]>;
}

export type WorkflowProgressEvent =
    | {
          type: 'run_status';
          status: WorkflowRun['status'];
          message?: string;
      }
    | {
          type: 'step_started' | 'step_completed' | 'step_failed';
          nodeId: string;
          nodeType: WorkflowNodeType;
          output?: unknown;
          error?: unknown;
      };

export interface WorkflowExecutionResult {
    status: WorkflowRun['status'];
    visitedNodeIds: string[];
    outputs: Record<string, unknown>;
    waitingApproval?: {
        nodeId: string;
        prompt: string;
    };
    error?: string;
}

interface StepExecutionState {
    visitedNodeIds: string[];
    outputs: Record<string, unknown>;
}

@injectable()
export class WorkflowExecutionService {
    private readonly activeRunAbortControllers = new Map<string, AbortController>();
    private readonly progressListeners = new Map<string, Set<(event: WorkflowProgressEvent) => void>>();

    constructor(
        @inject(CORETYPES.WorkflowRunService)
        private readonly workflowRunService: WorkflowRunService,
        @inject(CORETYPES.ModelProviderService)
        private readonly modelProviderService: ModelProviderService,
        @inject(CORETYPES.McpClientManager)
        private readonly mcpClientManager: McpClientManager,
    ) {}

    // Converts persisted canvas data into deterministic executable state before a run mutates status.
    public compileGraph(graph: WorkflowGraph): CompiledWorkflowGraph {
        const nodes = graph.nodes.map((node) => this.toWorkflowStep(node));
        const nodeById = new Map<string, WorkflowExecutableStep>();
        const outgoingEdges = new Map<string, WorkflowEdge[]>();
        const incomingCounts = new Map<string, number>();

        for (const node of nodes) {
            if (nodeById.has(node.id)) {
                throw new Error(`Duplicate workflow node id "${node.id}"`);
            }
            nodeById.set(node.id, node);
            outgoingEdges.set(node.id, []);
            incomingCounts.set(node.id, 0);
        }

        if (nodes.length === 0) {
            throw new Error('Workflow graph requires at least one node');
        }

        for (const edge of graph.edges.map((rawEdge) => this.toWorkflowEdge(rawEdge))) {
            if (!nodeById.has(edge.source) || !nodeById.has(edge.target)) {
                throw new Error('Workflow graph contains an edge with an unknown endpoint');
            }
            outgoingEdges.get(edge.source)?.push(edge);
            incomingCounts.set(edge.target, (incomingCounts.get(edge.target) ?? 0) + 1);
        }

        const queue = nodes.filter((node) => incomingCounts.get(node.id) === 0).map((node) => node.id);
        const orderedNodeIds: string[] = [];

        for (let index = 0; index < queue.length; index += 1) {
            const nodeId = queue[index];
            orderedNodeIds.push(nodeId);

            for (const edge of outgoingEdges.get(nodeId) ?? []) {
                const nextCount = (incomingCounts.get(edge.target) ?? 0) - 1;
                incomingCounts.set(edge.target, nextCount);
                if (nextCount === 0) {
                    queue.push(edge.target);
                }
            }
        }

        if (orderedNodeIds.length !== nodes.length) {
            throw new Error('Workflow graph must be a DAG');
        }

        const startNode = nodes.find((node) => node.type === 'start');
        const entryNodeId = startNode?.id ?? orderedNodeIds[0];
        const steps = orderedNodeIds
            .map((nodeId) => nodeById.get(nodeId))
            .filter((node): node is WorkflowExecutableStep => node !== undefined && node.type !== 'start');

        return {
            entryNodeId,
            orderedNodeIds,
            steps,
            nodeById,
            outgoingEdges,
        };
    }

    // Allows streaming adapters to observe in-process progress before persisted polling catches up.
    public subscribeToProgress(runId: string, listener: (event: WorkflowProgressEvent) => void): () => void {
        const listeners = this.progressListeners.get(runId) ?? new Set<(event: WorkflowProgressEvent) => void>();
        listeners.add(listener);
        this.progressListeners.set(runId, listeners);

        return () => {
            listeners.delete(listener);
            if (listeners.size === 0) {
                this.progressListeners.delete(runId);
            }
        };
    }

    // Executes the selected graph path and mirrors lifecycle changes into the run timeline.
    public async executeRun(input: WorkflowExecutionOptions | WorkflowRun): Promise<WorkflowExecutionResult> {
        const runId = 'runId' in input ? input.runId : input.id;
        const graph = 'graph' in input ? input.graph : this.createEmptyRunGraph();
        const initialInput = 'input' in input ? input.input : undefined;
        const externalSignal = 'signal' in input ? input.signal : undefined;
        const abortController = new AbortController();
        const state: StepExecutionState = {
            visitedNodeIds: [],
            outputs: {},
        };
        const abortListener = () => abortController.abort();

        if (externalSignal) {
            externalSignal.addEventListener('abort', abortListener, {once: true});
            if (externalSignal.aborted) {
                abortController.abort();
            }
        }

        this.activeRunAbortControllers.set(runId, abortController);

        try {
            await this.updateRunStatus(runId, 'running', 'Workflow execution started');

            if (abortController.signal.aborted) {
                return this.finishCancelledRun(runId, state);
            }

            const compiled = this.compileGraph(graph);
            let currentNodeId: string | undefined = compiled.entryNodeId;

            while (currentNodeId) {
                if (abortController.signal.aborted) {
                    return this.finishCancelledRun(runId, state);
                }

                const step = compiled.nodeById.get(currentNodeId);
                if (!step) {
                    throw new Error(`Workflow node "${currentNodeId}" was not compiled`);
                }

                if (step.type === 'start') {
                    currentNodeId = this.getNextNodeId(compiled, step.id);
                    continue;
                }

                state.visitedNodeIds.push(step.id);
                await this.startStep(runId, step);

                const stepResult = await this.executeStep(step, compiled, initialInput, abortController.signal);

                if (stepResult.status === 'waiting_approval') {
                    const waitingApproval = stepResult.waitingApproval;
                    if (!waitingApproval) {
                        throw new Error(`Workflow node "${step.id}" did not provide approval details`);
                    }
                    await this.workflowRunService.recordProgressEvent(
                        runId,
                        'Waiting for user approval',
                        {nodeId: step.id, nodeType: step.type, prompt: waitingApproval.prompt},
                        'waiting_approval',
                    );
                    await this.updateRunStatus(runId, 'waiting_approval', 'Workflow is waiting for user approval');
                    return {
                        status: 'waiting_approval',
                        visitedNodeIds: state.visitedNodeIds,
                        outputs: state.outputs,
                        waitingApproval,
                    };
                }

                state.outputs[step.id] = stepResult.output;
                await this.completeStep(runId, step, stepResult.output);
                currentNodeId = stepResult.nextNodeId;
            }

            await this.updateRunStatus(runId, 'completed', 'Workflow execution completed');
            return {
                status: 'completed',
                visitedNodeIds: state.visitedNodeIds,
                outputs: state.outputs,
            };
        } catch (error) {
            if (abortController.signal.aborted) {
                return this.finishCancelledRun(runId, state);
            }

            logger.error('Workflow execution failed', {runId, error});
            await this.updateRunStatus(runId, 'failed', 'Workflow execution failed');
            return {
                status: 'failed',
                visitedNodeIds: state.visitedNodeIds,
                outputs: state.outputs,
                error: error instanceof Error ? error.message : 'Workflow execution failed',
            };
        } finally {
            externalSignal?.removeEventListener('abort', abortListener);
            if (this.activeRunAbortControllers.get(runId) === abortController) {
                this.activeRunAbortControllers.delete(runId);
            }
        }
    }

    // Gives controllers a single cancellation path for persistence and any active in-memory execution.
    public async cancelRun(runId: string, message?: string): Promise<WorkflowRun | undefined> {
        this.activeRunAbortControllers.get(runId)?.abort();
        this.emitProgress(runId, {
            type: 'run_status',
            status: 'cancelled',
            message: message ?? 'Run cancelled',
        });
        return this.workflowRunService.cancelRun(runId, message);
    }

    // Dispatches node execution to the primitive that owns the node's side effects.
    private async executeStep(
        step: WorkflowExecutableStep,
        compiled: CompiledWorkflowGraph,
        input: unknown,
        signal: AbortSignal,
    ): Promise<{
        output?: unknown;
        nextNodeId?: string;
        status?: WorkflowRun['status'];
        waitingApproval?: {nodeId: string; prompt: string};
    }> {
        switch (step.type) {
            case 'agent':
                return {
                    output: await this.executeAgentStep(step, input, signal),
                    nextNodeId: this.getNextNodeId(compiled, step.id),
                };
            case 'if-else': {
                const condition = step.data.condition === true;
                return {
                    output: {condition},
                    nextNodeId: this.getNextNodeId(compiled, step.id, String(condition)) ??
                        this.getNextNodeId(compiled, step.id),
                };
            }
            case 'loop':
                return {
                    output: {
                        iterations: this.getNumber(step.data.iterations, 0),
                        items: [],
                    },
                    nextNodeId: this.getNextNodeId(compiled, step.id),
                };
            case 'http':
                return {
                    output: await this.executeHttpStep(step, signal),
                    nextNodeId: this.getNextNodeId(compiled, step.id),
                };
            case 'mcp':
                return {
                    output: await this.executeMcpStep(step),
                    nextNodeId: this.getNextNodeId(compiled, step.id),
                };
            case 'user-approval': {
                const prompt = this.getString(step.data.prompt, 'Approval required');
                return {
                    status: 'waiting_approval',
                    waitingApproval: {
                        nodeId: step.id,
                        prompt,
                    },
                };
            }
            case 'end':
                return {
                    output: {},
                    nextNodeId: undefined,
                };
            case 'start':
                return {
                    output: {},
                    nextNodeId: this.getNextNodeId(compiled, step.id),
                };
        }
    }

    // Executes an agent node through the configured provider registry and shared MCP tools.
    private async executeAgentStep(
        step: WorkflowExecutableStep,
        input: unknown,
        signal: AbortSignal,
    ): Promise<Record<string, unknown>> {
        const modelIdentifier = this.getString(step.data.modelIdentifier);
        if (!modelIdentifier) {
            throw new Error(`Agent node "${step.id}" requires a modelIdentifier`);
        }

        const prompt = this.resolvePrompt(this.getString(step.data.prompt, ''), input);
        const modelProviderRegistry = await this.modelProviderService.getModelProviderRegistry();
        const tools = await this.mcpClientManager.getAllTools();
        const hasTools = Object.keys(tools).length > 0;
        const result = await generateText({
            model: modelProviderRegistry.languageModel(modelIdentifier as `${string}:${string}`),
            messages: [
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            tools,
            stopWhen: hasTools ? stepCountIs(5) : undefined,
            abortSignal: signal,
        });

        return {
            text: result.text,
            finishReason: result.finishReason,
        };
    }

    // Executes an HTTP node while preserving response metadata for downstream nodes.
    private async executeHttpStep(step: WorkflowExecutableStep, signal: AbortSignal): Promise<Record<string, unknown>> {
        const url = this.getString(step.data.url);
        if (!url) {
            throw new Error(`HTTP node "${step.id}" requires a url`);
        }

        const method = this.getString(step.data.method, 'GET').toUpperCase();
        const headers = this.asStringRecord(step.data.headers);
        const requestInit: RequestInit = {
            method,
            headers,
            signal,
        };

        if (step.data.body !== undefined && method !== 'GET') {
            requestInit.body = typeof step.data.body === 'string' ? step.data.body : JSON.stringify(step.data.body);
        }

        const response = await fetch(url, requestInit);
        const responseText = await response.text();

        return {
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
            body: this.parseResponseBody(responseText, response.headers.get('content-type')),
        };
    }

    // Executes a named MCP tool from the current tool registry.
    private async executeMcpStep(step: WorkflowExecutableStep): Promise<unknown> {
        const toolName = this.getString(step.data.toolName);
        if (!toolName) {
            throw new Error(`MCP node "${step.id}" requires a toolName`);
        }

        const tools: ToolSet = await this.mcpClientManager.getAllTools();
        const tool = tools[toolName] as {execute?: (input: unknown) => Promise<unknown> | unknown} | undefined;
        if (!tool?.execute) {
            throw new Error(`MCP tool "${toolName}" is not available`);
        }

        const toolInput = this.asRecord(step.data.arguments) ?? {};
        return tool.execute(toolInput);
    }

    // Persists and emits step start so stream consumers see progress immediately.
    private async startStep(runId: string, step: WorkflowExecutableStep): Promise<void> {
        await this.workflowRunService.recordProgressEvent(
            runId,
            `Started ${step.type} step`,
            {nodeId: step.id, nodeType: step.type},
            'running',
        );
        this.emitProgress(runId, {
            type: 'step_started',
            nodeId: step.id,
            nodeType: step.type,
        });
    }

    // Persists and emits step completion with output for stream consumers and auditing.
    private async completeStep(runId: string, step: WorkflowExecutableStep, output: unknown): Promise<void> {
        await this.workflowRunService.recordProgressEvent(
            runId,
            `Completed ${step.type} step`,
            {nodeId: step.id, nodeType: step.type, output},
            'running',
        );
        this.emitProgress(runId, {
            type: 'step_completed',
            nodeId: step.id,
            nodeType: step.type,
            output,
        });
    }

    // Keeps run status persistence and progress listeners in sync.
    private async updateRunStatus(
        runId: string,
        status: WorkflowRun['status'],
        message: string,
    ): Promise<WorkflowRun | undefined> {
        const run = await this.workflowRunService.updateRunStatus(runId, status, message);
        this.emitProgress(runId, {
            type: 'run_status',
            status,
            message,
        });
        return run;
    }

    // Centralizes cancellation result formatting for both pre-start and mid-run aborts.
    private async finishCancelledRun(runId: string, state: StepExecutionState): Promise<WorkflowExecutionResult> {
        await this.updateRunStatus(runId, 'cancelled', 'Workflow execution cancelled');
        return {
            status: 'cancelled',
            visitedNodeIds: state.visitedNodeIds,
            outputs: state.outputs,
        };
    }

    // Chooses the next edge for normal flow or a named branch handle.
    private getNextNodeId(compiled: CompiledWorkflowGraph, nodeId: string, sourceHandle?: string): string | undefined {
        const outgoingEdges = compiled.outgoingEdges.get(nodeId) ?? [];
        if (sourceHandle !== undefined) {
            return outgoingEdges.find((edge) => edge.sourceHandle === sourceHandle)?.target;
        }
        return outgoingEdges[0]?.target;
    }

    // Normalizes untrusted graph node data into the runtime step shape.
    private toWorkflowStep(rawNode: Record<string, unknown>): WorkflowExecutableStep {
        const id = this.getString(rawNode.id);
        const data = this.asRecord(rawNode.data);
        const templateId = this.getString(data?.templateId);

        if (!id) {
            throw new Error('Workflow node is missing an id');
        }
        if (!templateId) {
            throw new Error(`Workflow node "${id}" is missing a templateId`);
        }
        if (!SUPPORTED_NODE_TYPES.has(templateId as WorkflowNodeType)) {
            throw new Error(`Unsupported workflow node type "${templateId}"`);
        }

        return {
            id,
            type: templateId as WorkflowNodeType,
            data: data ?? {},
        };
    }

    // Normalizes untrusted graph edge data and rejects incomplete edge records.
    private toWorkflowEdge(rawEdge: Record<string, unknown>): WorkflowEdge {
        const source = this.getString(rawEdge.source);
        const target = this.getString(rawEdge.target);

        if (!source || !target) {
            throw new Error('Workflow edge is missing a source or target');
        }

        return {
            id: this.getString(rawEdge.id) || undefined,
            source,
            target,
            sourceHandle: this.getString(rawEdge.sourceHandle) || undefined,
        };
    }

    // Performs minimal template substitution for run input passed into prompts.
    private resolvePrompt(prompt: string, input: unknown): string {
        const inputText = input === undefined ? '' : JSON.stringify(input);
        return prompt.replace(/\{\{\s*input\s*\}\}/g, inputText);
    }

    // Parses JSON responses when possible while preserving plain-text bodies.
    private parseResponseBody(responseText: string, contentType: string | null): unknown {
        if (!responseText) {
            return null;
        }

        if (contentType?.includes('application/json')) {
            try {
                return JSON.parse(responseText);
            } catch {
                return responseText;
            }
        }

        return responseText;
    }

    // Delivers in-memory progress to registered listeners for a single run.
    private emitProgress(runId: string, event: WorkflowProgressEvent): void {
        for (const listener of this.progressListeners.get(runId) ?? []) {
            listener(event);
        }
    }

    // Preserves legacy executeRun(run) behavior for callers that only have a run record.
    private createEmptyRunGraph(): WorkflowGraph {
        return {
            nodes: [
                {
                    id: 'end',
                    data: {
                        templateId: 'end',
                    },
                },
            ],
            edges: [],
        };
    }

    // Narrows arbitrary graph config values into object records.
    private asRecord(value: unknown): Record<string, unknown> | undefined {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            return undefined;
        }
        return value as Record<string, unknown>;
    }

    // Narrows arbitrary graph config values into string-keyed request headers.
    private asStringRecord(value: unknown): Record<string, string> {
        const record = this.asRecord(value);
        if (!record) {
            return {};
        }
        return Object.fromEntries(
            Object.entries(record)
                .filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
        );
    }

    // Reads string configuration with a caller-provided fallback.
    private getString(value: unknown, fallback = ''): string {
        return typeof value === 'string' ? value : fallback;
    }

    // Reads numeric configuration with a caller-provided fallback.
    private getNumber(value: unknown, fallback: number): number {
        return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
    }
}
