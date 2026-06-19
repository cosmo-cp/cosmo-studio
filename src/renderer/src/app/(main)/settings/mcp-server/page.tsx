import {McpServerManagement} from '@/components/mcp-server-management';

export default function McpServerSettingsPage() {
    return (
        <div className="flex h-full w-full flex-col overflow-y-auto p-4">
            <McpServerManagement />
        </div>
    );
}
