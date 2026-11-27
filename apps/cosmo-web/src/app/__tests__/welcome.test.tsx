import { StoreContext } from '@/app/store-provider';
import WelcomePage from '@/app/welcome/page';
import { createAppStore } from '@/lib/store/store';
import { createMockAppDataSource } from '@/test/mock-app-data-source';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import { SWRConfig } from 'swr';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
    useRouter: vi.fn(),
}));

describe('WelcomePage', () => {
    const mockPush = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useRouter).mockReturnValue({
            push: mockPush,
            prefetch: vi.fn(),
            replace: vi.fn(),
        } as unknown as ReturnType<typeof useRouter>);
    });

    it('renders heading, input, and submits user name to database', async () => {
        const user = userEvent.setup();
        const saveProfileSpy = vi.fn().mockResolvedValue({
            name: 'Gaurav',
            initials: 'GA',
            isConfigured: true,
        });

        const store = createAppStore(
            createMockAppDataSource({
                user: {
                    getProfile: async () => ({
                        name: '',
                        initials: 'GA',
                        isConfigured: false,
                    }),
                    saveProfile: saveProfileSpy,
                },
            }),
        );

        render(
            <SWRConfig value={{ provider: () => new Map() }}>
                <StoreContext.Provider value={store}>
                    <WelcomePage />
                </StoreContext.Provider>
            </SWRConfig>,
        );

        expect(screen.getByRole('heading', { name: /before you start/i })).toBeInTheDocument();
        expect(screen.getByText(/AI responses can be inaccurate/i)).toBeInTheDocument();
        expect(screen.getByText(/sometimes without asking for approval/i)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /software license/i })).toHaveAttribute(
            'href',
            expect.stringContaining('/LICENSE'),
        );
        await user.click(screen.getByRole('button', { name: /i understand/i }));
        expect(screen.getByText('Welcome to Cosmo')).toBeInTheDocument();
        expect(screen.getByText('What should we call you?')).toBeInTheDocument();

        const input = screen.getByRole('textbox', { name: /your name/i });
        await user.type(input, 'Alex');

        const submitButton = screen.getByRole('button', { name: /continue/i });
        await user.click(submitButton);

        expect(saveProfileSpy).toHaveBeenCalledWith({ name: 'Alex', photo: null });
        expect(mockPush).toHaveBeenCalledWith('/chat');
    });

    it('prefills existing name when user profile is already configured', async () => {
        const user = userEvent.setup();
        const store = createAppStore(
            createMockAppDataSource({
                user: {
                    getProfile: async () => ({
                        name: 'Existing User',
                        initials: 'EU',
                        isConfigured: true,
                    }),
                    saveProfile: vi.fn(),
                },
            }),
        );

        render(
            <SWRConfig value={{ provider: () => new Map() }}>
                <StoreContext.Provider value={store}>
                    <WelcomePage />
                </StoreContext.Provider>
            </SWRConfig>,
        );

        await user.click(screen.getByRole('button', { name: /i understand/i }));

        await waitFor(() => {
            const input = screen.getByRole('textbox', { name: /your name/i });
            expect(input).toHaveValue('Existing User');
        });
    });
});
