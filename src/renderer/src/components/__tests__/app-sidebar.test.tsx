import { AppSidebar } from '@/components/app-sidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { getDefaultSettingsHref } from '@/lib/settings-navigation';
import { render, screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({
    default: ({ children, href, ...props }: ComponentProps<'a'> & { href: string; prefetch?: boolean }) => {
        const { prefetch, ...anchorProps } = props;
        void prefetch;

        return (
            <a href={href} {...anchorProps}>
                {children}
            </a>
        );
    },
}));

vi.mock('next/navigation', () => ({
    usePathname: vi.fn(),
}));

const mockedUsePathname = vi.mocked(usePathname);

function renderSidebar(pathname: string) {
    mockedUsePathname.mockReturnValue(pathname);

    return render(
        <TooltipProvider>
            <SidebarProvider>
                <AppSidebar />
            </SidebarProvider>
        </TooltipProvider>,
    );
}

describe('AppSidebar', () => {
    it('shows the primary navigation and workspace info', () => {
        renderSidebar('/chat');

        expect(screen.getByRole('link', { name: /chat/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /tasks/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /agents/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /tools/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /projects/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /knowledge/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /usage/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /settings/i })).toHaveAttribute('href', getDefaultSettingsHref());
        expect(screen.getByText('Cosmo Workspace')).toBeInTheDocument();
        expect(screen.getByText('Professional')).toBeInTheDocument();
    });

    it('marks settings active on settings pages', () => {
        renderSidebar('/settings/provider');

        const settingsLink = screen.getByRole('link', { name: /settings/i });
        expect(settingsLink).toHaveAttribute('data-active', 'true');
    });

    it('marks chat active when on chat page', () => {
        renderSidebar('/chat');

        const chatLink = screen.getByRole('link', { name: /chat/i });
        expect(chatLink).toHaveAttribute('data-active', 'true');
    });
});
