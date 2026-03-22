import { memo, useEffect, useMemo, useRef, useState } from 'react';
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
    const [matches, setMatches] = useState<{ messageId: string; partIndex: number }[]>([]);
    const [matchStartIndexMap, setMatchStartIndexMap] = useState<Record<string, number>>({});
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

    useEffect(() => {
        if (!searchQuery) {
            setMatches([]);
            setMatchStartIndexMap({});
            if (onMatchesFound) onMatchesFound(0);
            return;
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

        setMatches(newMatches);
        setMatchStartIndexMap(newMatchStartIndexMap);
        if (onMatchesFound) onMatchesFound(newMatches.length);
    }, [searchQuery, messages, onMatchesFound]);

    const providersByName = useMemo(() => {
        return new Map(providers.map((provider) => [provider.name, provider]));
    }, [providers]);

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

    const highlightText = (text: string, query: string, messageId: string, partIndex: number) => {
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
                // Always render as default match initially. Active match is handled by useEffect via DOM manipulation.
                const style = 'background-color: #fef08a; color: black;';
                return `<mark id="match-${globalIndex}" style="${style}">${match}</mark>`;
            });
        } catch (e) {
            console.error('Error highlighting text', e);
            return text;
        }
    };

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
                    messages.map((message) => {
                        const isAssistant = message.role === 'assistant';
                        const modelInfo = isAssistant ? modelInfoByMessageId.get(message.id) : undefined;
                        const modelColorClass = modelInfo ? modelColorMap.get(modelInfo.identifier) : undefined;
                        const iconTheme = resolvedTheme === 'light' ? 'light' : 'dark';
                        const modelLabel = modelInfo?.label ?? 'Assistant';

                        const reasoningParts = isAssistant
                            ? message.parts.filter((part) => part.type === 'reasoning')
                            : [];
                        const hasTextContent = message.parts.some((p) => p.type === 'text' && p.text.length > 0);
                        const isReasoningStreaming = status === 'streaming' && !hasTextContent;

                        const sourcesParts = isAssistant
                            ? message.parts.filter((part) => part.type === 'source-url')
                            : [];

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

                        const renderedParts = message.parts.map((part, i) => {
                            switch (part.type) {
                                case 'text':
                                    return (
                                        <Message
                                            key={`${message.id}-${i}`}
                                            from={message.role}
                                            id={`message-${message.id}-part-${i}`}
                                        >
                                            <MessageContent>
                                                <MessageResponse key={searchQuery}>
                                                    {highlightText(part.text, searchQuery || '', message.id, i)}
                                                </MessageResponse>
                                            </MessageContent>
                                            {message.role === 'assistant' && (
                                                <MessageActions>
                                                    {/*<MessageAction
                                                        onClick={() => regenerate()}
                                                        label="Retry"
                                                    >
                                                        <RefreshCcwIcon className="size-3"/>
                                                    </MessageAction>*/}
                                                    <MessageAction
                                                        onClick={() => navigator.clipboard.writeText(part.text)}
                                                        label="Copy"
                                                    >
                                                        <CopyIcon className="size-3" />
                                                    </MessageAction>
                                                </MessageActions>
                                            )}
                                        </Message>
                                    );
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
                                    // Handle dynamic tool types (e.g., tool-getWeather, tool-searchFiles, dynamic-tool)
                                    if (part.type.startsWith('tool-') || part.type.endsWith('-tool')) {
                                        const toolPart = part as DynamicToolUIPart;
                                        const { state = 'input-available' } = toolPart;
                                        const approval = toolPart.approval;
                                        const toolName = toolPart.toolName;

                                        // Check if this is a completed tool with output
                                        const hasOutput = state === 'output-available' || state === 'output-error';
                                        const isError = state === 'output-error';

                                        return (
                                            <Tool key={`${message.id}-${i}`} defaultOpen={true}>
                                                <ToolHeader
                                                    title={toolName}
                                                    type={part.type as `tool-${string}`}
                                                    state={state}
                                                />
                                                <ToolContent>
                                                    {!!toolPart.input && <ToolInput input={toolPart.input} />}
                                                    {hasOutput ? (
                                                        <ToolOutput
                                                            output={toolPart.output}
                                                            errorText={isError ? toolPart.errorText : undefined}
                                                        />
                                                    ) : (
                                                        approval && (
                                                            <Confirmation approval={approval} state={state}>
                                                                <ConfirmationTitle>
                                                                    This tool requires your approval to run.
                                                                </ConfirmationTitle>
                                                                <ConfirmationRequest>
                                                                    <ConfirmationActions>
                                                                        <ConfirmationAction
                                                                            variant="outline"
                                                                            onClick={() => {
                                                                                addToolApprovalResponse?.({
                                                                                    id: approval.id,
                                                                                    approved: false,
                                                                                    reason: 'User denied tool call',
                                                                                });
                                                                            }}
                                                                        >
                                                                            Deny
                                                                        </ConfirmationAction>
                                                                        <ConfirmationAction
                                                                            onClick={() => {
                                                                                addToolApprovalResponse?.({
                                                                                    id: approval.id,
                                                                                    approved: true,
                                                                                });
                                                                            }}
                                                                        >
                                                                            Allow
                                                                        </ConfirmationAction>
                                                                    </ConfirmationActions>
                                                                </ConfirmationRequest>
                                                                <ConfirmationAccepted>
                                                                    Tool execution approved.
                                                                </ConfirmationAccepted>
                                                                <ConfirmationRejected>
                                                                    Tool call was denied.
                                                                </ConfirmationRejected>
                                                            </Confirmation>
                                                        )
                                                    )}
                                                </ToolContent>
                                            </Tool>
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
                                        </div>
                                    </div>
                                ) : (
                                    renderedParts
                                )}
                            </div>
                        );
                    })
                )}
                {status === 'submitted' && (
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
