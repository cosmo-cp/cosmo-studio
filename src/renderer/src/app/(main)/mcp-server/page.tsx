'use client';

import { McpServerManagement } from '@/components/mcp-server-management';

export default function McpServerPage() {
    return (
        <div className="flex h-full w-full flex-col p-4 overflow-y-auto">
            <McpServerManagement />
        </div>
    );
}
