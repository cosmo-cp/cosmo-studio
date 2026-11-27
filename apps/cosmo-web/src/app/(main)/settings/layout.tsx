'use client';

import { SettingsSecondarySidebar } from '@/components/settings-secondary-sidebar';
import type React from 'react';

export default function SettingsLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="flex h-full w-full overflow-hidden">
            <SettingsSecondarySidebar />
            <div className="flex-1 min-w-0 h-full overflow-y-auto">{children}</div>
        </div>
    );
}
