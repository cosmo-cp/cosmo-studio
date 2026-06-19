import {render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import CommandSettingsPage from '@/app/(main)/settings/command/page';

vi.mock('@/components/command-management', () => ({
    CommandManagement: () => <div>Command management</div>,
}));

describe('CommandSettingsPage', () => {
    it('renders command management inside settings', () => {
        render(<CommandSettingsPage />);

        expect(screen.getByText('Command management')).toBeInTheDocument();
    });
});
