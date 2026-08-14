'use client';

import { AppSidebar } from '@/components/app-sidebar';
import { SiteHeader } from '@/components/site-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import type React from 'react';
import { Toaster } from 'sonner';

// Reuse the primary app chrome so route states like 404 stay inside the normal shell.
export function AppShell({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <SidebarProvider
            style={
                {
                    '--sidebar-width-icon': '3rem',
                    '--header-height': 'calc(var(--spacing) * 14)',
                } as React.CSSProperties
            }
        >
            <AppSidebar />
            <SidebarInset className="h-[calc(100svh-var(--header-height))] max-h-[calc(100svh-var(--header-height))] overflow-hidden">
                <SiteHeader />
                <div className="@container/main flex min-h-0 w-full flex-1 flex-col overflow-hidden">{children}</div>
            </SidebarInset>
            <Toaster position="top-center" />
        </SidebarProvider>
    );
}
