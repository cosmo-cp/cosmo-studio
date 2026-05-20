'use client';

import type {UseChatHelpers} from '@ai-sdk/react';
import {Messages} from '@/components/messages';
import {WorkflowCanvas} from '@/components/workflow-canvas';
import type {WorkflowListItem} from '@/components/workflow-history';
import {Button} from '@/components/ui/button';
import {Separator} from '@/components/ui/separator';
import {Textarea} from '@/components/ui/textarea';
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@/components/ui/tooltip';
import {cn} from '@/lib/utils';
import {resolveAppDataSource} from '@/lib/app-data-source';
import type {UIMessage} from 'ai';
import {PencilLine, Play, Workflow, X} from 'lucide-react';
import {startTransition, useEffect, useMemo, useRef, useState} from 'react';

type WorkflowWorkspaceMode = 'edit' | 'run';
type WorkflowRunStatus = UseChatHelpers<UIMessage>['status'];

// Keep local workflow-runner messages in the same shape as the chat page so the shared Messages UI can render them.
function buildTextMessage({
    id,
    role,
    text,
}: {
    id: string;
    role: UIMessage['role'];
    text: string;
}): UIMessage {
    return {
        id,
        role,
        parts: [{type: 'text', text}],
    };
}

// Acknowledge the user request immediately while the backend run lifecycle catches up.
function buildWorkflowExecutionResponse(workflowTitle: string, prompt: string) {
    return `Started running "${workflowTitle}" with: ${prompt}`;
}

function WorkflowRunDrawer({
    workflow,
    isOpen,
    messages,
    query,
    status,
    onClose,
    onQueryChange,
    onSubmit,
}: {
    workflow: WorkflowListItem;
    isOpen: boolean;
    messages: UIMessage[];
    query: string;
    status: WorkflowRunStatus;
    onClose: () => void;
    onQueryChange: (value: string) => void;
    onSubmit: () => void;
}) {
    const isSubmitting = status === 'submitted' || status === 'streaming';

    return (
        <aside
            aria-hidden={!isOpen}
            className={cn(
                'absolute inset-y-0 right-0 z-20 flex w-full max-w-[420px] flex-col border-l bg-background shadow-xl transition-transform duration-300 ease-out',
                isOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'
            )}
            data-state={isOpen ? 'open' : 'closed'}
            data-testid="workflow-run-drawer"
        >
            <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
                <div className="flex min-w-0 items-start gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border bg-muted/40">
                        <Workflow className="size-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">Run Workflow</p>
                        <p className="truncate text-xs text-muted-foreground">{workflow.title}</p>
                    </div>
                </div>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                aria-label="Close workflow runner"
                                onClick={onClose}
                                size="icon"
                                type="button"
                                variant="ghost"
                            >
                                <X className="size-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left">
                            <p>Close</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
            <div className="min-h-0 flex-1">
                <Messages
                    chatId={`workflow-run-${workflow.id}`}
                    messages={messages}
                    status={status}
                />
            </div>
            <Separator />
            <form
                className="shrink-0 p-4"
                onSubmit={(event) => {
                    event.preventDefault();
                    onSubmit();
                }}
            >
                <div className="rounded-2xl border bg-background p-3 shadow-xs">
                    <Textarea
                        aria-label="Workflow query"
                        className="min-h-24 resize-none border-0 bg-transparent px-0 py-0 text-sm shadow-none focus-visible:ring-0"
                        data-testid="workflow-run-input"
                        disabled={isSubmitting}
                        onChange={(event) => onQueryChange(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter' && !event.shiftKey) {
                                event.preventDefault();
                                onSubmit();
                            }
                        }}
                        placeholder={`Ask ${workflow.title} what to run...`}
                        value={query}
                    />
                    <div className="mt-3 flex items-center justify-between gap-3">
                        <p className="text-xs text-muted-foreground">Press Enter to run, Shift+Enter for a new line.</p>
                        <Button disabled={isSubmitting || query.trim().length === 0} size="sm" type="submit">
                            <Play className="size-4" />
                            Execute
                        </Button>
                    </div>
                </div>
            </form>
        </aside>
    );
}

function WorkflowModeToggle({
    mode,
    onModeChange,
}: {
    mode: WorkflowWorkspaceMode;
    onModeChange: (nextMode: WorkflowWorkspaceMode) => void;
}) {
    return (
        <TooltipProvider>
            <div
                className="pointer-events-auto absolute top-4 left-1/2 z-10 flex -translate-x-1/2 flex-row gap-px overflow-hidden rounded-md border bg-card p-1 shadow-none"
                data-testid="workflow-mode-toggle"
            >
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            aria-label="Edit"
                            aria-pressed={mode === 'edit'}
                            onClick={() => onModeChange('edit')}
                            size="icon"
                            variant={mode === 'edit' ? 'secondary' : 'ghost'}
                        >
                            <PencilLine className="size-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                        <p>Edit</p>
                    </TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            aria-label="Run"
                            aria-pressed={mode === 'run'}
                            onClick={() => onModeChange('run')}
                            size="icon"
                            variant={mode === 'run' ? 'secondary' : 'ghost'}
                        >
                            <Play className="size-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                        <p>Run</p>
                    </TooltipContent>
                </Tooltip>
            </div>
        </TooltipProvider>
    );
}

export function WorkflowWorkspace({workflow}: {workflow: WorkflowListItem}) {
    const executionTimerRef = useRef<number | null>(null);
    const saveGraphTimerRef = useRef<number | null>(null);
    const appDataSource = useMemo(() => resolveAppDataSource(), []);
    const nextMessageIdRef = useRef(1);
    const [mode, setMode] = useState<WorkflowWorkspaceMode>('edit');
    const [query, setQuery] = useState('');
    const [status, setStatus] = useState<WorkflowRunStatus>('ready');
    const [messages, setMessages] = useState<UIMessage[]>([]);

    useEffect(() => {
        return () => {
            if (executionTimerRef.current !== null) {
                window.clearTimeout(executionTimerRef.current);
            }
            if (saveGraphTimerRef.current !== null) {
                window.clearTimeout(saveGraphTimerRef.current);
            }
        };
    }, []);

    // Persist graph edits with debounce so adding/removing/moving nodes is saved automatically.
    const handleGraphChange = (graph: {nodes: Record<string, unknown>[]; edges: Record<string, unknown>[]}) => {
        if (saveGraphTimerRef.current !== null) {
            window.clearTimeout(saveGraphTimerRef.current);
        }
        saveGraphTimerRef.current = window.setTimeout(() => {
            void appDataSource.workflow.saveGraph(workflow.id, graph);
            saveGraphTimerRef.current = null;
        }, 500);
    };

    // Keep mode changes responsive because they mount a fairly heavy canvas + chat composition.
    const handleModeChange = (nextMode: WorkflowWorkspaceMode) => {
        startTransition(() => {
            setMode(nextMode);
        });
    };

    const handleSubmitQuery = async () => {
        const trimmedQuery = query.trim();
        if (!trimmedQuery || status !== 'ready') {
            return;
        }

        const messageIdPrefix = `${workflow.id}-run-message`;
        const nextUserMessageId = `${messageIdPrefix}-${nextMessageIdRef.current}`;
        nextMessageIdRef.current += 1;
        const nextAssistantMessageId = `${messageIdPrefix}-${nextMessageIdRef.current}`;
        nextMessageIdRef.current += 1;

        setMessages((currentMessages) => [
            ...currentMessages,
            buildTextMessage({
                id: nextUserMessageId,
                role: 'user',
                text: trimmedQuery,
            }),
            buildTextMessage({
                id: nextAssistantMessageId,
                role: 'assistant',
                text: buildWorkflowExecutionResponse(workflow.title, trimmedQuery),
            }),
        ]);
        setQuery('');
        setStatus('submitted');
        handleModeChange('run');
        const run = await appDataSource.workflow.runStart({
            workflowId: workflow.id,
            workflowVersionId: undefined,
        });
        setStatus('streaming');
        const pollStatus = async () => {
            const runStatus = await appDataSource.workflow.runGet(run.id);
            const nextAssistantMessageId = `${messageIdPrefix}-${nextMessageIdRef.current}`;
            nextMessageIdRef.current += 1;
            setMessages((currentMessages) => [
                ...currentMessages,
                buildTextMessage({
                    id: nextAssistantMessageId,
                    role: 'assistant',
                    text: runStatus?.status === 'failed' ?
                        `Workflow failed: ${runStatus.errorMessage ?? 'Unknown error'}` :
                        `Workflow "${workflow.title}" run status: ${runStatus?.status ?? 'queued'}`,
                }),
            ]);
            if (runStatus?.status === 'completed' || runStatus?.status === 'failed' || runStatus?.status === 'cancelled') {
                setStatus('ready');
                executionTimerRef.current = null;
                return;
            }
            executionTimerRef.current = window.setTimeout(() => void pollStatus(), 600);
        };
        void pollStatus();
    };

    return (
        <div className="relative flex h-full flex-1 min-h-0 overflow-hidden bg-background">
            <WorkflowCanvas editable={mode === 'edit'} onGraphChange={handleGraphChange} workflow={workflow} />
            <WorkflowModeToggle mode={mode} onModeChange={handleModeChange} />
            <WorkflowRunDrawer
                isOpen={mode === 'run'}
                messages={messages}
                onClose={() => handleModeChange('edit')}
                onQueryChange={setQuery}
                onSubmit={() => void handleSubmitQuery()}
                query={query}
                status={status}
                workflow={workflow}
            />
        </div>
    );
}
