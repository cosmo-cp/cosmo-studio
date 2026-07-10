'use client';
import React from 'react';
import './globals.css';
import { ThemeProvider } from 'next-themes';
import { StoreProvider } from '@/store/provider';

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <body>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
                <StoreProvider>{children}</StoreProvider>
            </ThemeProvider>
        </body>
    );
}
