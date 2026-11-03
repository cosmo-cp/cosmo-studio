'use client';

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
import { GlobeIcon } from 'lucide-react';
import type { ComponentProps } from 'react';

export type SourcesProps = ComponentProps<typeof TraceCollapsible>;

export const Sources = ({ className, ...props }: SourcesProps) => (
    <Trace className={cn('not-prose mb-4', className)}>
        <TraceCollapsible {...props} />
    </Trace>
);

export type SourcesTriggerProps = ComponentProps<typeof TraceCollapsibleTrigger> & { count: number };

export const SourcesTrigger = ({ count, children, ...props }: SourcesTriggerProps) => (
    <TraceCollapsibleTrigger {...props}>
        {children ?? (
            <TraceLine>
                <TraceIcon>
                    <GlobeIcon />
                </TraceIcon>
                <TraceTitle>Used {count} sources</TraceTitle>
            </TraceLine>
        )}
    </TraceCollapsibleTrigger>
);

export type SourcesContentProps = ComponentProps<typeof TraceCollapsibleContent>;

export const SourcesContent = ({ children, ...props }: SourcesContentProps) => (
    <TraceCollapsibleContent {...props}>
        <Trace>{children}</Trace>
    </TraceCollapsibleContent>
);

export type SourceProps = ComponentProps<'a'>;

export const Source = ({ href, title, children, ...props }: SourceProps) => (
    <a href={href} rel="noreferrer" target="_blank" {...props}>
        <TraceLine>
            <TraceIcon>
                <GlobeIcon />
            </TraceIcon>
            <TraceTitle>
                {children ?? title}
                <span className="sr-only"> (opens in a new tab)</span>
            </TraceTitle>
        </TraceLine>
    </a>
);
