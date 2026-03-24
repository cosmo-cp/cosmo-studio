import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import equal from 'fast-deep-equal';
import type { UseChatHelpers } from '@ai-sdk/react';
import {
    Conversation,
    ConversationContent,
    ConversationEmptyState,
    ConversationScrollButton,
} from './ai-elements/conversation';
import {
    Message,
    MessageAction,
    MessageActions,
    MessageContent,
    MessageResponse,
} from '@/components/ai-elements/message';
import { CopyIcon, MessageSquare } from 'lucide-react';
import { Reasoning, ReasoningContent, ReasoningTrigger } from '@/components/ai-elements/reasoning';
import { Source, Sources, SourcesContent, SourcesTrigger } from '@/components/ai-elements/sources';
import { Loader } from '@/components/ai-elements/loader';
import { DynamicToolUIPart, UIMessage } from 'ai';
import { PreviewAttachment } from '@/components/preview-attachment';
import { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput } from './ai-elements/tool';
import {
    Confirmation,
    ConfirmationTitle,
    ConfirmationRequest,
    ConfirmationAccepted,
    ConfirmationRejected,
    ConfirmationActions,
    ConfirmationAction,
} from './ai-elements/confirmation';
import type { ProviderWithModels } from 'core/dto';
import ProviderIcon from '@/components/provider-icon';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

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

    return (
        <Tool key={`${messageId}-${partIndex}`} defaultOpen={true}>
            <ToolHeader title={toolName} type={part.type as `tool-${string}`} state={state} />
            <ToolContent>
                {!!part.input && <ToolInput input={part.input} />}
                {hasOutput ? (
                    <ToolOutput output={part.output} errorText={isError ? part.errorText : undefined} />
                ) : (
                    approval && (
                        <Confirmation approval={approval} state={state}>
                            <ConfirmationTitle>This tool requires your approval to run.</ConfirmationTitle>
                            <ConfirmationRequest>
                                <ConfirmationActions>
                                    <ConfirmationAction variant="outline" onClick={handleDeny}>
                                        Deny
                                    </ConfirmationAction>
                                    <ConfirmationAction onClick={handleAllow}>Allow</ConfirmationAction>
                                </ConfirmationActions>
                            </ConfirmationRequest>
                            <ConfirmationAccepted>Tool execution approved.</ConfirmationAccepted>
                            <ConfirmationRejected>Tool call was denied.</ConfirmationRejected>
                        </Confirmation>
                    )
                )}
            </ToolContent>
        </Tool>
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
                        <Message key={`${message.id}-${i}`} from={message.role} id={`message-${message.id}-part-${i}`}>
                            <MessageContent>
                                {highlighted ? (
                                    <div
                                        key={searchQuery}
                                        className="size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 prose dark:prose-invert prose-sm max-w-none"
                                        dangerouslySetInnerHTML={{ __html: highlighted }}
                                    />
                                ) : (
                                    <MessageResponse>{part.text}</MessageResponse>
                                )}
                            </MessageContent>
                            {message.role === 'assistant' && (
                                <MessageActions>
                                    <MessageAction onClick={() => handleCopy(part.text)} label="Copy">
                                        <CopyIcon className="size-3" />
                                    </MessageAction>
                                </MessageActions>
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
                                    <Reasoning
                                        key={`${message.id}-reasoning-${i}`}
                                        className="w-full"
                                        isStreaming={isReasoningStreaming}
                                    >
                                        <ReasoningTrigger />
                                        <ReasoningContent>{part.text}</ReasoningContent>
                                    </Reasoning>
                                ))}
                            {sourcesParts.length > 0 && (
                                <Sources>
                                    <SourcesTrigger count={sourcesParts.length} />
                                    {sourcesParts.map((part, idx) => (
                                        <SourcesContent key={`${message.id}-source-${idx}`}>
                                            <Source
                                                key={`${message.id}-source-${idx}`}
                                                href={part.url}
                                                title={part.url}
                                            />
                                        </SourcesContent>
                                    ))}
                                </Sources>
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
    regenerate: UseChatHelpers<UIMessage>['regenerate'];
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
    const { resolvedTheme } = useTheme();
    const [providers, setProviders] = useState<ProviderWithModels[]>([]);
    const prevMatchIndexRef = useRef<number | null>(null);

    useEffect(() => {
        let mounted = true;
        window.api.modelProvider
            .getProvidersWithModels()
            .then((list) => {
                if (mounted) {
                    setProviders(list);
                }
            })
            .catch((error) => {
                console.error('Failed to load providers', error);
            });
        return () => {
            mounted = false;
        };
    }, []);

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
        <Conversation>
            <ConversationContent>
                {messages.length === 0 ? (
                    <ConversationEmptyState
                        icon={<MessageSquare className="size-12" />}
                        title="Start a conversation"
                        description="Type a message below to begin chatting"
                    />
                ) : (
                    messages.map((message, index) => {
                        const isAssistant = message.role === 'assistant';
                        const modelInfo = isAssistant ? modelInfoByMessageId.get(message.id) : undefined;
                        const modelColorClass = modelInfo ? modelColorMap.get(modelInfo.identifier) : undefined;

                        return (
                            <MessageItem
                                key={message.id}
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
                        );
                    })
                )}
                {status === 'submitted' && messages[messages.length - 1]?.role !== 'assistant' && (
                    <div className="self-start">
                        <Loader />
                    </div>
                )}
            </ConversationContent>
            <ConversationScrollButton />
        </Conversation>
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
