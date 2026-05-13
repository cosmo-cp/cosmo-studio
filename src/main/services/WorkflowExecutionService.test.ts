import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkflowGraph, WorkflowRun } from 'core/dto';
import type { McpClientManager } from 'core/services/McpClientManager';
import type { ModelProviderService } from 'core/services/ModelProviderService';
import type { WorkflowRunService } from 'core/services/WorkflowRunService';

const ai = vi.hoisted(() => ({
    generateText: vi.fn(),
    stepCountIs: vi.fn((count: number) => `steps:${count}`),
}));

vi.mock('ai', () => ({
    generateText: ai.generateText,
    stepCountIs: ai.stepCountIs,
}));

vi.mock('../logger', () => ({
    logger: {
        warn: vi.fn(),
    },
}));

import { WorkflowExecutionService } from './WorkflowExecutionService';

function createGraph(nodes: WorkflowGraph['nodes'], edges: WorkflowGraph['edges']): WorkflowGraph {
    return { nodes, edges };
}

function createNode(id: string, templateId: string, config: Record<string, unknown> = {}) {
    return {
        id,
        data: {
            templateId,
            ...config,
        },
    };
}

function createService() {
    const registry = { languageModel: vi.fn(() => 'language-model') };
    const workflowRunService = {
        updateRunStatus: vi.fn().mockResolvedValue({ id: 'run-1' } as WorkflowRun),
        cancelRun: vi.fn().mockResolvedValue({ id: 'run-1', status: 'canceled' } as WorkflowRun),
        recordProgressEvent: vi.fn().mockResolvedValue(undefined),
    } as unknown as WorkflowRunService;
    const modelProviderService = {
        getModelProviderRegistry: vi.fn().mockResolvedValue(registry),
    } as unknown as ModelProviderService;
    const mcpClientManager = {
        getAllTools: vi.fn().mockResolvedValue({}),
    } as unknown as McpClientManager;
    const service = new WorkflowExecutionService(
        workflowRunService,
        modelProviderService,
        mcpClientManager,
    );

    return {
        service,
        registry,
        workflowRunService,
        modelProviderService,
        mcpClientManager,
    };
}

describe('WorkflowExecutionService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        ai.generateText.mockResolvedValue({
            text: 'agent result',
            finishReason: 'stop',
        });
    });

    it('compiles supported DAG nodes into executable steps', () => {
        const { service } = createService();
        const graph = createGraph(
            [
                createNode('start', 'start'),
                createNode('agent', 'agent', { prompt: 'Hello', modelIdentifier: 'openai/gpt' }),
                createNode('approval', 'user-approval'),
                createNode('end', 'end'),
            ],
            [
                { id: 'e1', source: 'start', target: 'agent' },
                { id: 'e2', source: 'agent', target: 'approval' },
                { id: 'e3', source: 'approval', target: 'end' },
            ],
        );

        const compiled = service.compileGraph(graph);

        expect(compiled.entryNodeId).toBe('start');
        expect(compiled.orderedNodeIds).toEqual(['start', 'agent', 'approval', 'end']);
        expect(compiled.steps.map((step) => [step.id, step.type])).toEqual([
            ['agent', 'agent'],
            ['approval', 'user-approval'],
            ['end', 'end'],
        ]);
    });

    it('rejects unsupported node types and cycles', () => {
        const { service } = createService();

        expect(() => service.compileGraph(createGraph([createNode('a', 'classify')], []))).toThrow(
            'Unsupported workflow node type "classify"',
        );
        expect(() => service.compileGraph(createGraph(
            [
                createNode('a', 'agent', { prompt: 'A', modelIdentifier: 'openai/gpt' }),
                createNode('b', 'http', { url: 'https://example.com' }),
            ],
            [
                { id: 'e1', source: 'a', target: 'b' },
                { id: 'e2', source: 'b', target: 'a' },
            ],
        ))).toThrow('Workflow graph must be a DAG');
    });

    it('executes agent and end nodes, records progress, and emits stream events', async () => {
        const { service, registry, workflowRunService, mcpClientManager } = createService();
        const progressEvents: string[] = [];
        service.subscribeToProgress('run-1', (event) => {
            progressEvents.push(`${event.type}:${event.nodeId ?? event.status}`);
        });

        const result = await service.executeRun({
            runId: 'run-1',
            input: { topic: 'workflow' },
            graph: createGraph(
                [
                    createNode('start', 'start'),
                    createNode('agent', 'agent', {
                        prompt: 'Write about {{input}}',
                        modelIdentifier: 'provider/model',
                    }),
                    createNode('end', 'end'),
                ],
                [
                    { id: 'e1', source: 'start', target: 'agent' },
                    { id: 'e2', source: 'agent', target: 'end' },
                ],
            ),
        });

        expect(result.status).toBe('completed');
        expect(result.visitedNodeIds).toEqual(['agent', 'end']);
        expect(result.outputs.agent).toEqual({ text: 'agent result', finishReason: 'stop' });
        expect(registry.languageModel).toHaveBeenCalledWith('provider/model');
        expect(mcpClientManager.getAllTools).toHaveBeenCalledTimes(1);
        expect(ai.generateText).toHaveBeenCalledWith(expect.objectContaining({
            model: 'language-model',
            messages: [
                {
                    role: 'user',
                    content: 'Write about {"topic":"workflow"}',
                },
            ],
            tools: {},
            stopWhen: undefined,
        }));
        expect(workflowRunService.updateRunStatus).toHaveBeenCalledWith(
            'run-1',
            'running',
            'Workflow execution started',
        );
        expect(workflowRunService.updateRunStatus).toHaveBeenCalledWith(
            'run-1',
            'completed',
            'Workflow execution completed',
        );
        expect(workflowRunService.recordProgressEvent).toHaveBeenCalledWith(
            'run-1',
            'Started agent step',
            expect.objectContaining({ nodeId: 'agent', nodeType: 'agent' }),
            'running',
        );
        expect(progressEvents).toEqual([
            'run_status:running',
            'step_started:agent',
            'step_completed:agent',
            'step_started:end',
            'step_completed:end',
            'run_status:completed',
        ]);
    });

    it('routes if-else branches and stops at user approval', async () => {
        const { service, workflowRunService } = createService();
        const graph = createGraph(
            [
                createNode('start', 'start'),
                createNode('branch', 'if-else', { condition: false }),
                createNode('agent', 'agent', { prompt: 'skip me', modelIdentifier: 'provider/model' }),
                createNode('approval', 'user-approval', { prompt: 'Approve release?' }),
                createNode('end', 'end'),
            ],
            [
                { id: 'e1', source: 'start', target: 'branch' },
                { id: 'e2', source: 'branch', target: 'agent', sourceHandle: 'true' },
                { id: 'e3', source: 'branch', target: 'approval', sourceHandle: 'false' },
                { id: 'e4', source: 'approval', target: 'end' },
            ],
        );

        const result = await service.executeRun({ runId: 'run-1', graph });

        expect(result.status).toBe('waiting_approval');
        expect(result.visitedNodeIds).toEqual(['branch', 'approval']);
        expect(result.waitingApproval).toEqual({
            nodeId: 'approval',
            prompt: 'Approve release?',
        });
        expect(ai.generateText).not.toHaveBeenCalled();
        expect(workflowRunService.updateRunStatus).toHaveBeenCalledWith(
            'run-1',
            'waiting_approval',
            'Workflow is waiting for user approval',
        );
    });

    it('executes loop, http, and mcp node primitives', async () => {
        const { service, mcpClientManager } = createService();
        const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
            ok: true,
            status: 200,
            statusText: 'OK',
            headers: new Headers({ 'content-type': 'application/json' }),
            text: vi.fn().mockResolvedValue('{"ok":true}'),
        } as unknown as Response);
        (mcpClientManager.getAllTools as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
            lookup: {
                execute: vi.fn().mockResolvedValue({ value: 42 }),
            },
        });

        const result = await service.executeRun({
            runId: 'run-1',
            graph: createGraph(
                [
                    createNode('start', 'start'),
                    createNode('loop', 'loop', { iterations: 2 }),
                    createNode('http', 'http', { url: 'https://example.com/api' }),
                    createNode('mcp', 'mcp', { toolName: 'lookup', arguments: { q: 'cosmo' } }),
                    createNode('end', 'end'),
                ],
                [
                    { id: 'e1', source: 'start', target: 'loop' },
                    { id: 'e2', source: 'loop', target: 'http' },
                    { id: 'e3', source: 'http', target: 'mcp' },
                    { id: 'e4', source: 'mcp', target: 'end' },
                ],
            ),
        });

        expect(result.status).toBe('completed');
        expect(result.outputs.loop).toEqual({ iterations: 2, items: [] });
        expect(result.outputs.http).toEqual(expect.objectContaining({
            ok: true,
            status: 200,
            body: { ok: true },
        }));
        expect(result.outputs.mcp).toEqual({ value: 42 });
        expect(fetchMock).toHaveBeenCalledWith('https://example.com/api', expect.objectContaining({
            method: 'GET',
        }));

        fetchMock.mockRestore();
    });

    it('persists cancellation for aborted executions and explicit cancellation requests', async () => {
        const { service, workflowRunService } = createService();
        const abortController = new AbortController();
        abortController.abort();

        const result = await service.executeRun({
            runId: 'run-1',
            signal: abortController.signal,
            graph: createGraph(
                [
                    createNode('start', 'start'),
                    createNode('agent', 'agent', { prompt: 'Hello', modelIdentifier: 'provider/model' }),
                ],
                [{ id: 'e1', source: 'start', target: 'agent' }],
            ),
        });

        await expect(service.cancelRun('run-1', 'User canceled')).resolves.toEqual({
            id: 'run-1',
            status: 'canceled',
        });
        expect(result.status).toBe('canceled');
        expect(workflowRunService.updateRunStatus).toHaveBeenCalledWith(
            'run-1',
            'canceled',
            'Workflow execution canceled',
        );
        expect(workflowRunService.cancelRun).toHaveBeenCalledWith('run-1', 'User canceled');
    });
});
