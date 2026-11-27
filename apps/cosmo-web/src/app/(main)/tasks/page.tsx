'use client';

import { useExperimentalFlag } from '@/features/experimental/flags';
import { TasksView } from '@/features/tasks/components/tasks-view';
import Link from 'next/link';

export default function TasksPage() {
    const enabled = useExperimentalFlag('tasks');
    if (enabled === undefined) return <div className="p-6">Checking feature availability...</div>;
    if (!enabled)
        return (
            <div className="p-6">
                This feature is disabled.{' '}
                <Link className="underline" href="/experimental">
                    Enable it in Experimental
                </Link>
                .
            </div>
        );
    return <TasksView />;
}
