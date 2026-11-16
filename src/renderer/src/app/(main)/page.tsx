'use client';

import { useUserProfileQuery } from '@/features/user/user-api';
import { useRouter } from 'next/navigation';
import { useEffect, type JSX } from 'react';

export default function Page(): JSX.Element {
    const router = useRouter();
    const { user, isLoading } = useUserProfileQuery();

    useEffect(() => {
        if (isLoading) return;

        if (user?.isConfigured) {
            router.replace('/chat');
        } else {
            router.replace('/welcome');
        }
    }, [router, user, isLoading]);

    return <div className="flex-1" aria-hidden="true" />;
}
