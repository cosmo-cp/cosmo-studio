'use client';

import { getDefaultSettingsChildHref } from '@/lib/settings-navigation';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function SettingsPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace(getDefaultSettingsChildHref());
    }, [router]);

    return (
        <div className="flex h-full w-full items-center justify-center p-4">
            <div className="text-sm text-muted-foreground">Opening settings...</div>
        </div>
    );
}
