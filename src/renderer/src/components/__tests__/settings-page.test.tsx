import {render, waitFor} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import SettingsPage from '@/app/(main)/settings/page';
import {useRouter} from 'next/navigation';
import {getDefaultSettingsChildHref} from '@/lib/settings-navigation';

vi.mock('next/navigation', () => ({
    useRouter: vi.fn(),
}));

describe('SettingsPage', () => {
    it('redirects to the first configured settings page', async () => {
        const replace = vi.fn();
        vi.mocked(useRouter).mockReturnValue({
            replace,
        } as unknown as ReturnType<typeof useRouter>);

        render(<SettingsPage />);

        await waitFor(() => {
            expect(replace).toHaveBeenCalledWith(getDefaultSettingsChildHref());
        });
    });
});
