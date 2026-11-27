'use client';

import { WorkspaceManagement } from '@/components/workspace-management';

export default function WorkspacesPage() {
    return (
        <div className="flex h-full w-full flex-col overflow-y-auto p-4">
            <WorkspaceManagement />
        </div>
    );
}
