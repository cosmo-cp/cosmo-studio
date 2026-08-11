import type { ReactNode } from 'react';
import './globals.css';
import { Providers } from './providers';

export default function RootLayout({
    children,
}: Readonly<{
    children: ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
            <body>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
