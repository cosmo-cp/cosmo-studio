import type {ReactNode} from "react";
import "./globals.css";
import {ThemeProvider} from "next-themes";
import {StoreProvider} from "@/lib/store/store-provider";

export default function RootLayout({
    children,
}: Readonly<{
    children: ReactNode;
}>) {
    return (
        <html lang="en">
            <body>
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
            </body>
        </html>
    );
}
