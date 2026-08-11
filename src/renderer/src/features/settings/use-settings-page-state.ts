'use client';

import { getDefaultSettingsChildHref } from '@/lib/settings-navigation';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function useSettingsPageState() {
    const router = useRouter();

    useEffect(() => {
        router.replace(getDefaultSettingsChildHref());
    }, [router]);

    return {
        isRedirecting: true,
    };
}
