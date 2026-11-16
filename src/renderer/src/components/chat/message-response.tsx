'use client';

import { cn } from '@/lib/utils';
import { cjk } from '@streamdown/cjk';
import { code } from '@streamdown/code';
import { math } from '@streamdown/math';
import { mermaid } from '@streamdown/mermaid';
import { memo } from 'react';
import type { ComponentProps } from 'react';
import { Streamdown } from 'streamdown';

const plugins = { cjk, code, math, mermaid };

// Render streaming Markdown consistently across chat messages.
export const MessageResponse = memo(({ className, ...props }: ComponentProps<typeof Streamdown>) => (
    <Streamdown
        className={cn('size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0', className)}
        plugins={plugins}
        {...props}
    />
));

MessageResponse.displayName = 'MessageResponse';
