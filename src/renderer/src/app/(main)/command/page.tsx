'use client';

import { CommandManagement } from '@/components/command-management';

// Provide a dedicated sidebar destination for command management.
export default function CommandsPage() {
    return (
        <div className="flex h-full w-full flex-col p-4">
            <CommandManagement />
        </div>
    );
}
