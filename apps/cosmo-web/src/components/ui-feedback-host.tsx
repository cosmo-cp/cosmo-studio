'use client';

import { useAppStore } from '@/lib/store/hooks';
import { useEffect } from 'react';
import { toast } from 'sonner';

export function UiFeedbackHost() {
    const nextToast = useAppStore((state) => state.queue[0] ?? null);
    const dequeueToast = useAppStore((state) => state.dequeueToast);

    useEffect(() => {
        if (!nextToast) {
            return;
        }

        if (nextToast.type === 'error') {
            toast.error(nextToast.description);
        } else {
            toast.success(nextToast.description);
        }

        dequeueToast(nextToast.id);
    }, [dequeueToast, nextToast]);

    return null;
}
