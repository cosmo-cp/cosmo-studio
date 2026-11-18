import { PersonalizationSidebar } from '@/components/personalization-sidebar';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AppearancePage from '../(main)/personalization/appearance/page';
import GeneralPage from '../(main)/personalization/general/page';
import KeyboardPage from '../(main)/personalization/keyboard/page';

const setTheme = vi.fn();
vi.mock('next-themes', () => ({ useTheme: () => ({ theme: 'system', setTheme }) }));
vi.mock('next/navigation', () => ({ usePathname: () => '/personalization/appearance' }));

describe('Personalization', () => {
    it('links to each page and identifies the current page', () => {
        render(<PersonalizationSidebar />);
        for (const [name, slug] of [
            ['General', 'general'],
            ['Appearance', 'appearance'],
            ['Notifications', 'notifications'],
            ['Keyboard', 'keyboard'],
            ['Profile', 'profile'],
        ]) {
            expect(screen.getByRole('link', { name })).toHaveAttribute('href', `/personalization/${slug}`);
        }
        expect(screen.getByRole('link', { name: 'Appearance' })).toHaveAttribute('aria-current', 'page');
    });
    it('changes the theme from the appearance page', () => {
        render(<AppearancePage />);
        expect(screen.getByRole('button', { name: 'system' })).toHaveAttribute('aria-pressed', 'true');
        fireEvent.click(screen.getByRole('button', { name: 'dark' }));
        expect(setTheme).toHaveBeenCalledWith('dark');
    });
    it('links to persona management from general', () => {
        render(<GeneralPage />);
        expect(screen.getByRole('link', { name: 'Manage personas' })).toHaveAttribute('href', '/settings/persona');
    });
    it('shows keyboard shortcuts directly on the page', () => {
        render(<KeyboardPage />);
        expect(screen.getByText('Toggle Sidebar')).toBeInTheDocument();
        expect(screen.getByText('Send message')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /view keyboard shortcuts/i })).not.toBeInTheDocument();
    });
});
