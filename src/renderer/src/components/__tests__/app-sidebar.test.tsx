import type {ComponentProps} from 'react';
import {render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {SidebarProvider} from '@/components/ui/sidebar';
import {AppSidebar} from '@/components/app-sidebar';
import {usePathname} from 'next/navigation';
import {getDefaultSettingsHref, getSettingsItemHref} from '@/lib/settings-navigation';

vi.mock('next/link', () => ({
    default: ({
        children,
        href,
        ...props
    }: ComponentProps<'a'> & {href: string; prefetch?: boolean}) => {
        const {prefetch, ...anchorProps} = props;
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
        <SidebarProvider>
            <AppSidebar />
        </SidebarProvider>
    );
}

describe('AppSidebar', () => {
    it('shows the main navigation outside of settings', () => {
        renderSidebar('/workflow');

        expect(screen.getByRole('link', {name: /chat/i})).toBeInTheDocument();
        expect(screen.getByRole('link', {name: /workflow/i})).toHaveAttribute(
            'data-active',
            'true'
        );
        expect(screen.getByRole('link', {name: /persona/i})).toBeInTheDocument();
        expect(screen.getByRole('link', {name: /command/i})).toBeInTheDocument();
        expect(screen.queryByRole('link', {name: /agents/i})).not.toBeInTheDocument();
        expect(screen.getByRole('link', {name: /settings/i})).toHaveAttribute(
            'href',
            getDefaultSettingsHref()
        );
        expect(screen.queryByRole('link', {name: /back/i})).not.toBeInTheDocument();
    });

    it('shows the settings submenu on the settings landing page', () => {
        renderSidebar('/settings');

        const backLink = screen.getByRole('link', {name: /back/i});

        expect(backLink.closest('[data-sidebar="footer"]')).not.toBeNull();
        expect(screen.getByRole('link', {name: /back/i})).toHaveAttribute(
            'href',
            '/chat'
        );
        expect(screen.getByRole('link', {name: /provider/i})).toHaveAttribute(
            'href',
            getSettingsItemHref('/settings', 'provider')
        );
        expect(screen.getByRole('link', {name: /web search/i})).toHaveAttribute(
            'href',
            getSettingsItemHref('/settings', 'web-search')
        );
        expect(screen.getByRole('link', {name: /agents/i})).toHaveAttribute(
            'href',
            getSettingsItemHref('/settings', 'agents')
        );
        expect(screen.queryByRole('link', {name: /chat/i})).not.toBeInTheDocument();
    });

    it('keeps the nested settings menu active on child settings pages', () => {
        renderSidebar('/settings/provider');

        const backLink = screen.getByRole('link', {name: /back/i});

        expect(backLink.closest('[data-sidebar="footer"]')).not.toBeNull();
        expect(backLink).toHaveAttribute(
            'href',
            '/chat'
        );
        expect(screen.getByRole('link', {name: /provider/i})).toHaveAttribute(
            'data-active',
            'true'
        );
        expect(screen.getByRole('link', {name: /web search/i})).toHaveAttribute(
            'href',
            getSettingsItemHref('/settings/provider', 'web-search')
        );
        expect(screen.getByRole('link', {name: /agents/i})).toHaveAttribute(
            'href',
            getSettingsItemHref('/settings/provider', 'agents')
        );
    });

    it('marks agents active in the settings submenu', () => {
        renderSidebar('/settings/agents');

        expect(screen.getByRole('link', {name: /agents/i})).toHaveAttribute(
            'data-active',
            'true'
        );
    });
});
