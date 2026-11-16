'use client';

import { StoreProvider } from '@/app/store-provider';
import { UiFeedbackHost } from '@/components/ui-feedback-host';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from 'next-themes';
import type { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
    return (
        <StoreProvider>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
                <TooltipProvider>
                    <UiFeedbackHost />
                    {children}
                </TooltipProvider>
            </ThemeProvider>
        </StoreProvider>
    );
}
