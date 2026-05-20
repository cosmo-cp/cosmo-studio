'use client';

import {AcpAgentManagement} from '@/components/acp-agent-management';

export default function AgentsPage() {
    return (
        <div className="flex h-full w-full flex-col overflow-y-auto p-4">
            <AcpAgentManagement />
        </div>
    );
}
