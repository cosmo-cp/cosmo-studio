import { PreviewAttachment } from '@/components/preview-attachment';
import ProviderIcon from '@/components/provider-icon';
import { Bubble, BubbleContent } from '@/components/ui/bubble';
import { Button } from '@/components/ui/button';
import { CodeBlock, CodeBlockActions, CodeBlockContent, CodeBlockCopyButton } from '@/components/ui/code-block';
import { Item, ItemActions, ItemContent, ItemTitle } from '@/components/ui/item';
import { Message, MessageContent, MessageFooter } from '@/components/ui/message';
import {
    MessageScroller,
    MessageScrollerButton,
    MessageScrollerContent,
    MessageScrollerItem,
    MessageScrollerProvider,
    MessageScrollerViewport,
} from '@/components/ui/message-scroller';
import { Spinner as Loader } from '@/components/ui/spinner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
    Trace,
    TraceCollapsible,
    TraceCollapsibleContent,
    TraceCollapsibleTrigger,
    TraceIcon,
    TraceLine,
    TraceTitle,
} from '@/components/ui/trace';
import { useGetProvidersQuery } from '@/features/providers/providers-api';
import { cn } from '@/lib/utils';
import type { UseChatHelpers } from '@ai-sdk/react';
import { cjk } from '@streamdown/cjk';
import { code } from '@streamdown/code';
import { math } from '@streamdown/math';
import { mermaid } from '@streamdown/mermaid';
import { DynamicToolUIPart, UIMessage } from 'ai';
import type { ProviderWithModels } from 'core/dto';
import equal from 'fast-deep-equal';
import { BrainIcon, CopyIcon, GlobeIcon, MessageSquare, WrenchIcon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Streamdown } from 'streamdown';

const streamdownPlugins = { cjk, code, math, mermaid };

// Keep streaming reasoning visible until it has finished, then allow the reader to reopen it.
function ReasoningTrace({ text, isStreaming }: { text: string; isStreaming: boolean }) {
    const [open, setOpen] = useState(isStreaming);
    const [duration, setDuration] = useState<number>();
    const started = useRef<number | null>(null);
    const hasStreamed = useRef(isStreaming);
    useEffect(() => {
        if (isStreaming) {
            hasStreamed.current = true;
            started.current ??= Date.now();
            const timer = setTimeout(() => setOpen(true), 0);
            return () => clearTimeout(timer);
        }
        if (started.current !== null) {
            const elapsed = Math.ceil((Date.now() - started.current) / 1000);
            setTimeout(() => setDuration(elapsed), 0);
            started.current = null;
        }
        if (hasStreamed.current) {
            const timer = setTimeout(() => setOpen(false), 1000);
            return () => clearTimeout(timer);
        }
    }, [isStreaming]);
    return (
        <Trace className="not-prose mb-4 w-full">
            <TraceCollapsible open={open} onOpenChange={setOpen}>
                <TraceCollapsibleTrigger>
                    <TraceLine status={isStreaming ? 'running' : undefined}>
                        <TraceIcon>
                            <BrainIcon />
                        </TraceIcon>
                        <TraceTitle>
                            {isStreaming
                                ? 'Thinking...'
                                : duration === undefined
                                  ? 'Thought for a few seconds'
                                  : `Thought for ${duration} seconds`}
                        </TraceTitle>
                    </TraceLine>
                </TraceCollapsibleTrigger>
                <TraceCollapsibleContent className="mt-4 text-sm text-muted-foreground">
                    <Streamdown plugins={streamdownPlugins}>{text}</Streamdown>
                </TraceCollapsibleContent>
            </TraceCollapsible>
        </Trace>
    );
}

// Present structured tool input and output with a copy action.
function ToolData({ label, value, error = false }: { label: string; value: unknown; error?: boolean }) {
    if (value === undefined || value === null || value === '') return null;
    const content = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    return (
        <div className="space-y-2 overflow-hidden break-words">
            <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</h4>
            <CodeBlock variant={error ? 'destructive' : 'default'}>
                <CodeBlockActions className="opacity-100">
                    <CodeBlockCopyButton value={content} />
                </CodeBlockActions>
                <CodeBlockContent lineNumbers wrap className="py-3 font-mono text-xs">
                    {content}
                </CodeBlockContent>
            </CodeBlock>
        </div>
    );
}

const MODEL_NAME_COLORS = [
    'text-emerald-600 dark:text-emerald-400',
    'text-sky-600 dark:text-sky-400',
    'text-amber-600 dark:text-amber-400',
    'text-violet-600 dark:text-violet-400',
    'text-rose-600 dark:text-rose-400',
    'text-teal-600 dark:text-teal-400',
    'text-lime-600 dark:text-lime-400',
    'text-orange-600 dark:text-orange-400',
    'text-cyan-600 dark:text-cyan-400',
    'text-fuchsia-600 dark:text-fuchsia-400',
] as const;

type MessageMetadata = {
    modelId?: string;
};

// Normalize a model identifier into provider/model parts for display.
const splitModelIdentifier = (modelIdentifier: string) => {
    const [providerName, ...modelParts] = modelIdentifier.split(':');
    if (modelParts.length === 0) {
        return { providerName: undefined, modelId: modelIdentifier };
    }
    return { providerName, modelId: modelParts.join(':') };
};

// Extract the model identifier from message metadata so UI can render per-model badges.
const getMessageModelIdentifier = (message: UIMessage) => {
    const metadata = message.metadata as MessageMetadata | undefined;
    return metadata?.modelId;
};

// --- Pure helper: highlight search matches in text (module-scope, no re-creation) ---
function highlightText(
    text: string,
    query: string,
    messageId: string,
    partIndex: number,
    matchStartIndexMap: Record<string, number>,
): string {
    if (!query) return text;
    const partKey = `${messageId}-${partIndex}`;
    const startIndex = matchStartIndexMap[partKey];
    if (startIndex === undefined) return text;

    try {
        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedQuery})`, 'gi');

        let matchCount = 0;
        return text.replace(regex, (match) => {
            const globalIndex = startIndex + matchCount;
            matchCount++;
            const style = 'background-color: #fef08a; color: black;';
            return `<mark id="match-${globalIndex}" style="${style}">${match}</mark>`;
        });
    } catch (e) {
        console.error('Error highlighting text', e);
        return text;
    }
}

// --- Precompute per-message derived data in a single pass ---
type ReasoningPart = Extract<UIMessage['parts'][number], { type: 'reasoning' }>;
type SourceUrlPart = Extract<UIMessage['parts'][number], { type: 'source-url' }>;

interface MessageDerivedData {
    reasoningParts: ReasoningPart[];
    sourcesParts: SourceUrlPart[];
    hasTextContent: boolean;
    hasAnyContent: boolean;
}

function computeMessageData(parts: UIMessage['parts']): MessageDerivedData {
    const reasoningParts: ReasoningPart[] = [];
    const sourcesParts: SourceUrlPart[] = [];
    let hasTextContent = false;
    let hasAnyContent = false;

    for (const part of parts) {
        switch (part.type) {
            case 'reasoning':
                reasoningParts.push(part);
                hasAnyContent = true;
                break;
            case 'source-url':
                sourcesParts.push(part);
                hasAnyContent = true;
                break;
            case 'text':
                if (part.text.length > 0) {
                    hasTextContent = true;
                    hasAnyContent = true;
                }
                break;
            default:
                if (part.type.startsWith('tool-') || part.type.endsWith('-tool')) {
                    hasAnyContent = true;
                }
                break;
        }
    }

    return { reasoningParts, sourcesParts, hasTextContent, hasAnyContent };
}

// --- Memoized ToolPartRenderer: prevents re-render of static tool parts ---

interface ToolPartRendererProps {
    part: DynamicToolUIPart;
    messageId: string;
    partIndex: number;
    addToolApprovalResponse?: UseChatHelpers<UIMessage>['addToolApprovalResponse'];
}

const ToolPartRenderer = memo(function ToolPartRenderer({
    part,
    messageId,
    partIndex,
    addToolApprovalResponse,
}: ToolPartRendererProps) {
    const { state = 'input-available' } = part;
    const approval = part.approval;
    const toolName = part.toolName;
    const hasOutput = state === 'output-available' || state === 'output-error';
    const isError = state === 'output-error';
    const isFinished = hasOutput || state === 'output-denied';
    const [open, setOpen] = useState(!isFinished);
    const [wasFinished, setWasFinished] = useState(isFinished);
    if (isFinished !== wasFinished) {
        setWasFinished(isFinished);
        if (isFinished) setOpen(false);
    }

    const handleDeny = useCallback(() => {
        addToolApprovalResponse?.({
            id: approval!.id,
            approved: false,
            reason: 'User denied tool call',
        });
    }, [addToolApprovalResponse, approval]);

    const handleAllow = useCallback(() => {
        addToolApprovalResponse?.({
            id: approval!.id,
            approved: true,
        });
    }, [addToolApprovalResponse, approval]);

    const labels: Record<DynamicToolUIPart['state'], string> = {
        'approval-requested': 'Awaiting Approval',
        'approval-responded': 'Responded',
        'input-available': 'Running',
        'input-streaming': 'Pending',
        'output-available': 'Completed',
        'output-denied': 'Denied',
        'output-error': 'Error',
    };
    const responded = state === 'approval-responded' || state === 'output-denied' || state === 'output-available';
    return (
        <Trace key={`${messageId}-${partIndex}`} className="not-prose mb-4">
            <TraceCollapsible open={open} onOpenChange={setOpen}>
                <TraceCollapsibleTrigger>
                    <TraceLine status={isError ? 'error' : state === 'input-available' ? 'running' : undefined}>
                        <TraceIcon>
                            <WrenchIcon />
                        </TraceIcon>
                        <TraceTitle>
                            {toolName} · {labels[state]}
                        </TraceTitle>
                    </TraceLine>
                </TraceCollapsibleTrigger>
                <TraceCollapsibleContent className="space-y-4">
                    {!!part.input && <ToolData label="Parameters" value={part.input} />}
                    {hasOutput ? (
                        <ToolData
                            label={isError ? 'Error' : 'Result'}
                            value={isError ? part.errorText : part.output}
                            error={isError}
                        />
                    ) : (
                        approval &&
                        state !== 'input-streaming' &&
                        state !== 'input-available' && (
                            <Item variant="outline" size="sm">
                                <ItemContent>
                                    <ItemTitle>This tool requires your approval to run.</ItemTitle>
                                    {responded &&
                                        (approval.approved ? 'Tool execution approved.' : 'Tool call was denied.')}
                                </ItemContent>
                                {state === 'approval-requested' && (
                                    <ItemActions>
                                        <Button type="button" size="sm" variant="outline" onClick={handleDeny}>
                                            Deny
                                        </Button>
                                        <Button type="button" size="sm" onClick={handleAllow}>
                                            Allow
                                        </Button>
                                    </ItemActions>
                                )}
                            </Item>
                        )
                    )}
                </TraceCollapsibleContent>
            </TraceCollapsible>
        </Trace>
    );
});

// --- Memoized MessageItem: the critical optimization ---

interface MessageItemProps {
    message: UIMessage;
    isLastMessage: boolean;
    status: UseChatHelpers<UIMessage>['status'];
    searchQuery?: string;
    matchStartIndexMap: Record<string, number>;
    modelInfo?: { identifier: string; label: string; providerType?: ProviderWithModels['type'] };
    modelColorClass?: string;
    resolvedTheme?: string;
    addToolApprovalResponse?: UseChatHelpers<UIMessage>['addToolApprovalResponse'];
}

const MessageItem = memo(
    function MessageItem({
        message,
        isLastMessage,
        status,
        searchQuery,
        matchStartIndexMap,
        modelInfo,
        modelColorClass,
        resolvedTheme,
        addToolApprovalResponse,
    }: MessageItemProps) {
        const isAssistant = message.role === 'assistant';

        // Single-pass computation of derived data
        const { reasoningParts, sourcesParts, hasTextContent, hasAnyContent } = useMemo(
            () => computeMessageData(message.parts),
            [message.parts],
        );

        const isReasoningStreaming = status === 'streaming' && !hasTextContent;
        const isLoading =
            isAssistant && isLastMessage && (status === 'streaming' || status === 'submitted') && !hasAnyContent;

        const iconTheme = resolvedTheme === 'light' ? 'light' : 'dark';
        const modelLabel = modelInfo?.label ?? 'Assistant';

        const assistantAvatar = isAssistant ? (
            <div className="flex size-7 items-center justify-center rounded-full border bg-background">
                {modelInfo?.providerType ? (
                    <ProviderIcon
                        className="mr-0 rounded-full"
                        size={14}
                        theme={iconTheme}
                        type={modelInfo.providerType}
                    />
                ) : (
                    <MessageSquare className="size-3 text-muted-foreground" />
                )}
            </div>
        ) : null;

        const assistantName = isAssistant ? (
            <span
                className={cn('text-xs font-semibold', modelColorClass ?? 'text-muted-foreground')}
                title={modelInfo?.identifier ?? modelLabel}
            >
                {modelLabel}
            </span>
        ) : null;

        // Stable copy handler
        const handleCopy = useCallback((text: string) => {
            navigator.clipboard.writeText(text);
        }, []);

        const renderedParts = message.parts.map((part, i) => {
            switch (part.type) {
                case 'text': {
                    const highlighted = searchQuery
                        ? highlightText(part.text, searchQuery, message.id, i, matchStartIndexMap)
                        : null;
                    return (
                        <Message
                            key={`${message.id}-${i}`}
                            align={message.role === 'user' ? 'end' : 'start'}
                            id={`message-${message.id}-part-${i}`}
                        >
                            <MessageContent>
                                {message.role === 'user' ? (
                                    <Bubble align="end" variant="muted">
                                        <BubbleContent>
                                            {highlighted ? (
                                                <div
                                                    key={searchQuery}
                                                    className="prose dark:prose-invert prose-sm max-w-none"
                                                    dangerouslySetInnerHTML={{ __html: highlighted }}
                                                />
                                            ) : (
                                                <Streamdown
                                                    plugins={streamdownPlugins}
                                                    className="size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                                                >
                                                    {part.text}
                                                </Streamdown>
                                            )}
                                        </BubbleContent>
                                    </Bubble>
                                ) : highlighted ? (
                                    <div
                                        key={searchQuery}
                                        className="size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 prose dark:prose-invert prose-sm max-w-none"
                                        dangerouslySetInnerHTML={{ __html: highlighted }}
                                    />
                                ) : (
                                    <Streamdown
                                        plugins={streamdownPlugins}
                                        className="size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                                    >
                                        {part.text}
                                    </Streamdown>
                                )}
                            </MessageContent>
                            {message.role === 'assistant' && (
                                <MessageFooter>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    aria-label="Copy"
                                                    onClick={() => handleCopy(part.text)}
                                                >
                                                    <CopyIcon className="size-3" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>Copy</TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </MessageFooter>
                            )}
                        </Message>
                    );
                }
                case 'file':
                    return (
                        <div key={`${message.id}-${i}`} className="flex flex-row justify-end gap-2 m-2">
                            <PreviewAttachment
                                attachment={{
                                    name: part.filename ?? 'file',
                                    contentType: part.mediaType,
                                    url: part.url,
                                }}
                            />
                        </div>
                    );
                default: {
                    if (part.type.startsWith('tool-') || part.type.endsWith('-tool')) {
                        return (
                            <ToolPartRenderer
                                key={`${message.id}-${i}`}
                                part={part as DynamicToolUIPart}
                                messageId={message.id}
                                partIndex={i}
                                addToolApprovalResponse={addToolApprovalResponse}
                            />
                        );
                    }
                    return null;
                }
            }
        });

        return (
            <div key={message.id}>
                {isAssistant ? (
                    <div className="flex items-start gap-3">
                        <div className="mt-1">{assistantAvatar}</div>
                        <div className="flex min-w-0 flex-col gap-2">
                            {assistantName}
                            {reasoningParts.length > 0 &&
                                reasoningParts.map((part, i) => (
                                    <ReasoningTrace
                                        key={`${message.id}-reasoning-${i}`}
                                        isStreaming={isReasoningStreaming}
                                        text={part.text}
                                    />
                                ))}
                            {sourcesParts.length > 0 && (
                                <Trace className="not-prose mb-4">
                                    <TraceCollapsible>
                                        <TraceCollapsibleTrigger>
                                            <TraceLine>
                                                <TraceIcon>
                                                    <GlobeIcon />
                                                </TraceIcon>
                                                <TraceTitle>Used {sourcesParts.length} sources</TraceTitle>
                                            </TraceLine>
                                        </TraceCollapsibleTrigger>
                                        <TraceCollapsibleContent>
                                            <Trace>
                                                {sourcesParts.map((part, idx) => (
                                                    <a
                                                        key={`${message.id}-source-${idx}`}
                                                        href={part.url}
                                                        rel="noreferrer"
                                                        target="_blank"
                                                    >
                                                        <TraceLine>
                                                            <TraceIcon>
                                                                <GlobeIcon />
                                                            </TraceIcon>
                                                            <TraceTitle>
                                                                {part.url}
                                                                <span className="sr-only"> (opens in a new tab)</span>
                                                            </TraceTitle>
                                                        </TraceLine>
                                                    </a>
                                                ))}
                                            </Trace>
                                        </TraceCollapsibleContent>
                                    </TraceCollapsible>
                                </Trace>
                            )}
                            {renderedParts}
                            {isLoading && <Loader className="mt-2 self-start" />}
                        </div>
                    </div>
                ) : (
                    renderedParts
                )}
            </div>
        );
    },
    (prevProps, nextProps) => {
        // Fast-path: skip re-render when nothing relevant changed
        if (prevProps.searchQuery !== nextProps.searchQuery) return false;
        if (prevProps.status !== nextProps.status) return false;
        if (prevProps.isLastMessage !== nextProps.isLastMessage) return false;
        if (prevProps.modelColorClass !== nextProps.modelColorClass) return false;
        if (prevProps.resolvedTheme !== nextProps.resolvedTheme) return false;

        // If streaming the last message, always re-render it for token updates
        if (nextProps.isLastMessage && nextProps.status === 'streaming') return false;

        // Deep compare the message object only for non-streaming states
        return (
            equal(prevProps.message, nextProps.message) &&
            prevProps.matchStartIndexMap === nextProps.matchStartIndexMap &&
            prevProps.modelInfo === nextProps.modelInfo
        );
    },
);

// --- Main Messages container (slimmed down) ---

interface MessagesProps {
    chatId: string;
    status: UseChatHelpers<UIMessage>['status'];
    messages: UIMessage[];
    searchQuery?: string;
    currentMatchIndex?: number;
    onMatchesFound?: (count: number) => void;
    addToolApprovalResponse?: UseChatHelpers<UIMessage>['addToolApprovalResponse'];
}

function PureMessages({
    status,
    messages,
    searchQuery,
    currentMatchIndex,
    onMatchesFound,
    addToolApprovalResponse,
}: MessagesProps) {
    const { data: providers = [] } = useGetProvidersQuery();
    const { resolvedTheme } = useTheme();
    const prevMatchIndexRef = useRef<number | null>(null);

    const providersByName = useMemo(() => {
        return new Map(providers.map((provider) => [provider.name, provider]));
    }, [providers]);

    const { matches, matchStartIndexMap } = useMemo(() => {
        if (!searchQuery) {
            return { matches: [], matchStartIndexMap: {} };
        }

        const newMatches: { messageId: string; partIndex: number }[] = [];
        const newMatchStartIndexMap: Record<string, number> = {};

        messages.forEach((m) => {
            m.parts.forEach((p, pIndex) => {
                if (p.type === 'text') {
                    const text = p.text.toLowerCase();
                    const query = searchQuery.toLowerCase();
                    let startIndex = 0;
                    let index;

                    const partKey = `${m.id}-${pIndex}`;
                    newMatchStartIndexMap[partKey] = newMatches.length;

                    while ((index = text.indexOf(query, startIndex)) > -1) {
                        newMatches.push({ messageId: m.id, partIndex: pIndex });
                        startIndex = index + query.length;
                    }
                }
            });
        });

        return { matches: newMatches, matchStartIndexMap: newMatchStartIndexMap };
    }, [searchQuery, messages]);

    useEffect(() => {
        if (onMatchesFound) {
            onMatchesFound(matches.length);
        }
    }, [matches.length, onMatchesFound]);

    const modelColorMap = useMemo(() => {
        const map = new Map<string, string>();
        let index = 0;
        messages.forEach((message) => {
            if (message.role !== 'assistant') return;
            const modelIdentifier = getMessageModelIdentifier(message);
            if (!modelIdentifier || map.has(modelIdentifier)) return;
            map.set(modelIdentifier, MODEL_NAME_COLORS[index % MODEL_NAME_COLORS.length]);
            index += 1;
        });
        return map;
    }, [messages]);

    const modelInfoByMessageId = useMemo(() => {
        const map = new Map<string, { identifier: string; label: string; providerType?: ProviderWithModels['type'] }>();
        messages.forEach((message) => {
            if (message.role !== 'assistant') return;
            const modelIdentifier = getMessageModelIdentifier(message);
            if (!modelIdentifier) return;
            const { providerName, modelId } = splitModelIdentifier(modelIdentifier);
            const provider = providerName ? providersByName.get(providerName) : undefined;
            const label = modelId ?? modelIdentifier;
            map.set(message.id, {
                identifier: modelIdentifier,
                label,
                providerType: provider?.type,
            });
        });
        return map;
    }, [messages, providersByName]);

    useEffect(() => {
        let highlightTimer: number | undefined;
        let fallbackResetTimer: number | undefined;

        // Reset previous match style
        if (prevMatchIndexRef.current !== null) {
            const prevIndex = prevMatchIndexRef.current - 1;
            const prevEl = document.getElementById(`match-${prevIndex}`);
            if (prevEl) {
                prevEl.style.backgroundColor = '#fef08a';
                prevEl.style.color = 'black';
            }
        }

        if (currentMatchIndex && currentMatchIndex > 0 && currentMatchIndex <= matches.length) {
            const matchIndex = currentMatchIndex - 1;
            // We need a small delay to allow render to update the DOM with new IDs if search query changed
            highlightTimer = window.setTimeout(() => {
                const matchElement = document.getElementById(`match-${matchIndex}`);
                if (matchElement) {
                    matchElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    matchElement.style.backgroundColor = '#f97316';
                    matchElement.style.color = 'white';
                    prevMatchIndexRef.current = currentMatchIndex;
                } else {
                    // Fallback to message scrolling if specific match element not found
                    const match = matches[matchIndex];
                    if (match) {
                        const elementId = `message-${match.messageId}-part-${match.partIndex}`;
                        const element = document.getElementById(elementId);
                        if (element) {
                            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            element.classList.add('bg-muted');
                            fallbackResetTimer = window.setTimeout(() => element.classList.remove('bg-muted'), 2000);
                        }
                    }
                }
            }, 100);
        } else {
            prevMatchIndexRef.current = null;
        }

        return () => {
            if (highlightTimer) {
                window.clearTimeout(highlightTimer);
            }
            if (fallbackResetTimer) {
                window.clearTimeout(fallbackResetTimer);
            }
        };
    }, [currentMatchIndex, matches]);

    return (
        <MessageScrollerProvider autoScroll>
            <MessageScroller className="relative h-full min-h-0 flex-1 overflow-y-hidden">
                <MessageScrollerViewport className="overflow-y-auto">
                    <MessageScrollerContent className="flex flex-col gap-8 p-4">
                        {messages.length === 0 ? (
                            <div className="flex size-full flex-col items-center justify-center gap-3 p-8 text-center">
                                <div className="text-muted-foreground">
                                    <MessageSquare className="size-12" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-sm font-medium">Start a conversation</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Type a message below to begin chatting
                                    </p>
                                </div>
                            </div>
                        ) : (
                            messages.map((message, index) => {
                                const isAssistant = message.role === 'assistant';
                                const modelInfo = isAssistant ? modelInfoByMessageId.get(message.id) : undefined;
                                const modelColorClass = modelInfo ? modelColorMap.get(modelInfo.identifier) : undefined;

                                return (
                                    <MessageScrollerItem key={message.id} messageId={message.id}>
                                        <MessageItem
                                            message={message}
                                            isLastMessage={index === messages.length - 1}
                                            status={status}
                                            searchQuery={searchQuery}
                                            matchStartIndexMap={matchStartIndexMap}
                                            modelInfo={modelInfo}
                                            modelColorClass={modelColorClass}
                                            resolvedTheme={resolvedTheme}
                                            addToolApprovalResponse={addToolApprovalResponse}
                                        />
                                    </MessageScrollerItem>
                                );
                            })
                        )}
                        {status === 'submitted' && messages[messages.length - 1]?.role !== 'assistant' && (
                            <div className="self-start">
                                <Loader />
                            </div>
                        )}
                    </MessageScrollerContent>
                </MessageScrollerViewport>
                <MessageScrollerButton />
            </MessageScroller>
        </MessageScrollerProvider>
    );
}

export const Messages = memo(PureMessages, (prevProps, nextProps) => {
    if (prevProps.searchQuery !== nextProps.searchQuery) return false;
    if (prevProps.currentMatchIndex !== nextProps.currentMatchIndex) return false;
    if (prevProps.status !== nextProps.status) return false;

    // Always re-render when streaming to ensure token updates are reflected immediately
    if (nextProps.status === 'streaming') return false;

    // Use deep comparison for static states to avoid unnecessary re-renders
    return equal(prevProps.messages, nextProps.messages);
});
