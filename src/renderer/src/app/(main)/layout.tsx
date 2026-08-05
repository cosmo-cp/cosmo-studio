'use client';

import { AppSidebar } from '@/components/app-sidebar';
import { SiteHeader } from '@/components/site-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import React from 'react';
import { Toaster } from 'sonner';

export default function MainLayout({
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
                <div className="@container/main flex flex-1 flex-col min-h-0 w-full overflow-hidden">{children}</div>
            </SidebarInset>
            <Toaster position="top-center" />
        </SidebarProvider>
    );
}
