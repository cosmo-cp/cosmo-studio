'use client';

import type { ReactNode } from 'react';
import { ThemeProvider } from 'next-themes';
import { StoreProvider } from '@/lib/store/store-provider';

export function Providers({ children }: { children: ReactNode }) {
    return (
        <StoreProvider>
            <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
            >
                {children}
            </ThemeProvider>
        </StoreProvider>
    );
}
