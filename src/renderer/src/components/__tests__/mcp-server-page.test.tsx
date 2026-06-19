import {render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import McpServerSettingsPage from '@/app/(main)/settings/mcp-server/page';

vi.mock('@/components/mcp-server-management', () => ({
    McpServerManagement: () => <div>MCP server management</div>,
}));

describe('McpServerSettingsPage', () => {
    it('renders MCP server management inside settings', () => {
        render(<McpServerSettingsPage />);

        expect(screen.getByText('MCP server management')).toBeInTheDocument();
    });
});
