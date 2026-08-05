'use client';

import { CosmoIcon } from '@/components/cosmo-icon';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function SplashPage() {
    const router = useRouter();

    useEffect(() => {
        router.prefetch('/chat');

        const timeout = setTimeout(() => {
            router.push('/chat');
        }, 1000);

        return () => clearTimeout(timeout);
    }, [router]);

    return (
        <div className="h-screen flex items-center justify-center bg-background text-foreground">
            <div className="flex flex-col items-center gap-6">
                <div className="w-20 h-20 flex items-center justify-center rounded-2xl bg-primary text-primary-foreground animate-pulse">
                    <CosmoIcon size={76} />
                </div>
                <div className="flex flex-col items-center gap-2">
                    <h1 className="text-2xl font-semibold tracking-tight">Cosmo</h1>
                    <p className="text-sm text-muted-foreground">Studio</p>
                </div>
                <div className="flex items-center gap-1 mt-4">
                    <span
                        className="w-2 h-2 rounded-full bg-primary animate-bounce"
                        style={{ animationDelay: '-0.3s' }}
                    ></span>
                    <span
                        className="w-2 h-2 rounded-full bg-primary animate-bounce"
                        style={{ animationDelay: '-0.15s' }}
                    ></span>
                    <span
                        className="w-2 h-2 rounded-full bg-primary animate-bounce"
                        style={{ animationDelay: '0s' }}
                    ></span>
                </div>
            </div>
        </div>
    );
}
