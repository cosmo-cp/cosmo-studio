'use client';

import { WorkflowPageContent } from '@/components/workflow-page-content';
import { useExperimentalFlag } from '@/features/experimental/flags';
import Link from 'next/link';

export default function WorkflowPage() {
    const enabled = useExperimentalFlag('workflow');
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
    return <WorkflowPageContent />;
}
