'use client';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
    Trace,
    TraceCollapsible,
    TraceCollapsibleContent,
    TraceCollapsibleTrigger,
    TraceIcon,
    TraceLine,
    TraceTitle,
} from '@/components/ui/trace';
import { cn } from '@/lib/utils';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import { cjk } from '@streamdown/cjk';
import { code } from '@streamdown/code';
import { math } from '@streamdown/math';
import { mermaid } from '@streamdown/mermaid';
import { BrainIcon } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { createContext, memo, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Streamdown } from 'streamdown';

interface ReasoningContextValue {
    isStreaming: boolean;
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    duration: number | undefined;
}

const ReasoningContext = createContext<ReasoningContextValue | null>(null);

export const useReasoning = () => {
    const context = useContext(ReasoningContext);
    if (!context) {
        throw new Error('Reasoning components must be used within Reasoning');
    }
    return context;
};

export type ReasoningProps = ComponentProps<typeof Collapsible> & {
    isStreaming?: boolean;
    open?: boolean;
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    duration?: number;
};

const AUTO_CLOSE_DELAY = 1000;
const MS_IN_S = 1000;

export const Reasoning = memo(
    ({
        className,
        isStreaming = false,
        open,
        defaultOpen,
        onOpenChange,
        duration: durationProp,
        children,
        ...props
    }: ReasoningProps) => {
        const resolvedDefaultOpen = defaultOpen ?? isStreaming;
        // Track if defaultOpen was explicitly set to false (to prevent auto-open)
        const isExplicitlyClosed = defaultOpen === false;

        const [isOpen, setIsOpen] = useControllableState<boolean>({
            defaultProp: resolvedDefaultOpen,
            onChange: onOpenChange,
            prop: open,
        });
        const [duration, setDuration] = useControllableState<number | undefined>({
            defaultProp: undefined,
            prop: durationProp,
        });

        const hasEverStreamedRef = useRef(isStreaming);
        const [hasAutoClosed, setHasAutoClosed] = useState(false);
        const startTimeRef = useRef<number | null>(null);

        // Track when streaming starts and compute duration
        useEffect(() => {
            if (isStreaming) {
                hasEverStreamedRef.current = true;
                if (startTimeRef.current === null) {
                    startTimeRef.current = Date.now();
                }
            } else if (startTimeRef.current !== null) {
                setDuration(Math.ceil((Date.now() - startTimeRef.current) / MS_IN_S));
                startTimeRef.current = null;
            }
        }, [isStreaming, setDuration]);

        // Auto-open when streaming starts (unless explicitly closed)
        useEffect(() => {
            if (isStreaming && !isOpen && !isExplicitlyClosed) {
                setIsOpen(true);
            }
        }, [isStreaming, isOpen, setIsOpen, isExplicitlyClosed]);

        // Auto-close when streaming ends (once only, and only if it ever streamed)
        useEffect(() => {
            if (hasEverStreamedRef.current && !isStreaming && isOpen && !hasAutoClosed) {
                const timer = setTimeout(() => {
                    setIsOpen(false);
                    setHasAutoClosed(true);
                }, AUTO_CLOSE_DELAY);

                return () => clearTimeout(timer);
            }
        }, [isStreaming, isOpen, setIsOpen, hasAutoClosed]);

        const handleOpenChange = useCallback(
            (newOpen: boolean) => {
                setIsOpen(newOpen);
            },
            [setIsOpen],
        );

        const contextValue = useMemo(
            () => ({ duration, isOpen, isStreaming, setIsOpen }),
            [duration, isOpen, isStreaming, setIsOpen],
        );

        return (
            <ReasoningContext.Provider value={contextValue}>
                <Trace className={cn('not-prose mb-4', className)}>
                    <TraceCollapsible onOpenChange={handleOpenChange} open={isOpen} {...props}>
                        {children}
                    </TraceCollapsible>
                </Trace>
            </ReasoningContext.Provider>
        );
    },
);

export type ReasoningTriggerProps = ComponentProps<typeof CollapsibleTrigger> & {
    getThinkingMessage?: (isStreaming: boolean, duration?: number) => ReactNode;
};

const defaultGetThinkingMessage = (isStreaming: boolean, duration?: number) => {
    if (isStreaming || duration === 0) {
        return <>Thinking...</>;
    }
    if (duration === undefined) {
        return <>Thought for a few seconds</>;
    }
    return <>Thought for {duration} seconds</>;
};

export const ReasoningTrigger = memo(
    ({ className, children, getThinkingMessage = defaultGetThinkingMessage, ...props }: ReasoningTriggerProps) => {
        const { isStreaming, duration } = useReasoning();

        return (
            <TraceCollapsibleTrigger className={className} {...props}>
                {children ?? (
                    <TraceLine status={isStreaming ? 'running' : undefined}>
                        <TraceIcon>
                            <BrainIcon />
                        </TraceIcon>
                        <TraceTitle>{getThinkingMessage(isStreaming, duration)}</TraceTitle>
                    </TraceLine>
                )}
            </TraceCollapsibleTrigger>
        );
    },
);

export type ReasoningContentProps = ComponentProps<typeof CollapsibleContent> & {
    children: string;
};

const streamdownPlugins = { cjk, code, math, mermaid };

export const ReasoningContent = memo(({ className, children, ...props }: ReasoningContentProps) => (
    <TraceCollapsibleContent
        className={cn(
            'mt-4 text-sm',
            'data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-muted-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in',
            className,
        )}
        {...props}
    >
        <Streamdown plugins={streamdownPlugins}>{children}</Streamdown>
    </TraceCollapsibleContent>
));

Reasoning.displayName = 'Reasoning';
ReasoningTrigger.displayName = 'ReasoningTrigger';
ReasoningContent.displayName = 'ReasoningContent';
