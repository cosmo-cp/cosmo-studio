import { StoreContext } from '@/app/store-provider';
import { NavUser } from '@/components/nav-user';
import { SidebarProvider } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { createAppStore } from '@/lib/store/store';
import { createMockAppDataSource } from '@/test/mock-app-data-source';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { SWRConfig } from 'swr';
import { beforeEach, describe, expect, it, vi } from 'vitest';

class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
}

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

function renderNavUser(customStore?: ReturnType<typeof createAppStore>) {
    const store = customStore ?? createAppStore(createMockAppDataSource());

    return render(
        <SWRConfig value={{ provider: () => new Map() }}>
            <TooltipProvider>
                <StoreContext.Provider value={store}>
                    <SidebarProvider>
                        <NavUser />
                    </SidebarProvider>
                </StoreContext.Provider>
            </TooltipProvider>
        </SWRConfig>,
    );
}

describe('NavUser', () => {
    beforeEach(() => {
        vi.stubGlobal('ResizeObserver', ResizeObserverMock);
        document.body.removeAttribute('data-scroll-locked');
        document.body.style.pointerEvents = '';
    });

    it('renders the user trigger button with avatar initials and name without plus', () => {
        renderNavUser();

        expect(screen.getByText('GA')).toBeInTheDocument();
        expect(screen.getByText('Gaurav')).toBeInTheDocument();
        expect(screen.queryByText('Plus')).not.toBeInTheDocument();
    });

    it('opens the dropdown menu without logout or find workspaces or plus', async () => {
        const user = userEvent.setup();
        renderNavUser();

        const triggerButton = screen.getByRole('button', { name: /gaurav/i });
        await user.click(triggerButton);

        // Menu items should be visible
        expect(await screen.findByText('Personalization')).toBeInTheDocument();
        expect(screen.getByText('Profile')).toBeInTheDocument();
        expect(screen.getByText('Help')).toBeInTheDocument();

        // Removed items must not be present
        expect(screen.queryByText('Find workspaces')).not.toBeInTheDocument();
        expect(screen.queryByText('Log out')).not.toBeInTheDocument();
        expect(screen.queryByText('Plus')).not.toBeInTheDocument();

        // Links have proper destinations
        const personalizationLink = screen.getByRole('menuitem', { name: /personalization/i });
        expect(personalizationLink).toHaveAttribute('href', '/personalization/general');

        const profileLink = screen.getByRole('menuitem', { name: /profile/i });
        expect(profileLink).toHaveAttribute('href', '/profile');
    });

    it('renders all help submenu options and opens their links', async () => {
        const user = userEvent.setup();
        const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

        renderNavUser();

        const triggerButton = screen.getByRole('button', { name: /gaurav/i });
        await user.click(triggerButton);

        const helpTrigger = await screen.findByText('Help');
        await user.click(helpTrigger);

        // Submenu items
        const helpCenter = await screen.findByText('Help center');
        const privacyCenter = screen.getByText('Privacy guidance');
        const releaseNotes = screen.getByText('Release notes');
        const downloadApps = screen.getByText('Download apps');
        const keyboardShortcuts = screen.getByText('Keyboard shortcuts');
        const reportBug = screen.getByText('Report a bug');

        expect(helpCenter).toBeInTheDocument();
        expect(privacyCenter).toBeInTheDocument();
        expect(releaseNotes).toBeInTheDocument();
        expect(downloadApps).toBeInTheDocument();
        expect(keyboardShortcuts).toBeInTheDocument();
        expect(reportBug).toBeInTheDocument();

        fireEvent.click(helpCenter.closest('[role="menuitem"]')!);
        expect(openSpy).toHaveBeenCalledWith('https://cosmocp.com/docs/home', '_blank');

        openSpy.mockRestore();
    });

    it('opens keyboard shortcuts dialog via menu item', async () => {
        const user = userEvent.setup();
        renderNavUser();

        const triggerButton = screen.getByRole('button', { name: /gaurav/i });
        await user.click(triggerButton);

        const helpTrigger = await screen.findByText('Help');
        await user.click(helpTrigger);

        const shortcutsItem = await screen.findByText('Keyboard shortcuts');
        fireEvent.click(shortcutsItem.closest('[role="menuitem"]')!);

        expect(await screen.findByRole('heading', { name: /keyboard shortcuts/i })).toBeInTheDocument();
    });

    it('opens keyboard shortcuts dialog via ⌘/ shortcut key', async () => {
        renderNavUser();

        fireEvent.keyDown(window, { key: '/', metaKey: true });
        expect(await screen.findByRole('heading', { name: /keyboard shortcuts/i })).toBeInTheDocument();
    });

    it('renders avatar photo when user has a photo configured', async () => {
        const store = createAppStore(
            createMockAppDataSource({
                user: {
                    getProfile: async () => ({
                        name: 'Gaurav',
                        initials: 'GA',
                        photo: 'data:image/png;base64,myavatar',
                        isConfigured: true,
                    }),
                },
            }),
        );

        renderNavUser(store);

        const img = await screen.findByRole('img', { name: /gaurav/i });
        expect(img).toHaveAttribute('src', 'data:image/png;base64,myavatar');
    });
});
