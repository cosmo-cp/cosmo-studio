'use client';

import { AppShell } from '@/components/app-shell';
import React from 'react';

export default function MainLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return <AppShell>{children}</AppShell>;
}
