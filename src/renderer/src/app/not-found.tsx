import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

// Keep unmatched routes inside the main application frame instead of replacing it.
export default function NotFoundPage() {
    return (
        <AppShell>
            <main className="flex min-h-0 flex-1 items-center justify-center p-4 sm:p-6">
                <section className="flex w-full max-w-xl flex-col items-center rounded-lg border bg-background px-6 py-10 text-center shadow-xs sm:px-10">
                    <p className="text-sm font-medium tracking-[0.2em] text-muted-foreground uppercase">404</p>
                    <h1 className="mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                        Page not found
                    </h1>
                    <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground sm:text-base">
                        The page you requested does not exist or is no longer available.
                    </p>
                    <Button asChild className="mt-6">
                        <Link href="/chat">Go to chat</Link>
                    </Button>
                </section>
            </main>
        </AppShell>
    );
}
