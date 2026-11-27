import { PersonalizationSidebar } from '@/components/personalization-sidebar';
import type { ReactNode } from 'react';

export default function PersonalizationLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex h-full w-full overflow-hidden">
            <PersonalizationSidebar />
            <div className="h-full min-w-0 flex-1 overflow-y-auto">{children}</div>
        </div>
    );
}
