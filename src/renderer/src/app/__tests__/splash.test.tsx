import SplashPage from '@/app/splash/page';
import { StoreContext } from '@/app/store-provider';
import { createAppStore } from '@/lib/store/store';
import { createMockAppDataSource } from '@/test/mock-app-data-source';
import { render, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { SWRConfig } from 'swr';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
    useRouter: vi.fn(),
}));

describe('SplashPage', () => {
    const mockPush = vi.fn();
    const mockPrefetch = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useRouter).mockReturnValue({
            push: mockPush,
            prefetch: mockPrefetch,
            replace: vi.fn(),
        } as unknown as ReturnType<typeof useRouter>);
    });

    it('redirects to /chat if user is already configured', async () => {
        const store = createAppStore(
            createMockAppDataSource({
                user: {
                    getProfile: async () => ({
                        name: 'Gaurav',
                        initials: 'GA',
                        isConfigured: true,
                    }),
                },
            }),
        );

        render(
            <SWRConfig value={{ provider: () => new Map() }}>
                <StoreContext.Provider value={store}>
                    <SplashPage />
                </StoreContext.Provider>
            </SWRConfig>,
        );

        await waitFor(
            () => {
                expect(mockPush).toHaveBeenCalledWith('/chat');
            },
            { timeout: 2000 },
        );
    });

    it('redirects to /welcome if user is not configured', async () => {
        const store = createAppStore(
            createMockAppDataSource({
                user: {
                    getProfile: async () => ({
                        name: '',
                        initials: 'GA',
                        isConfigured: false,
                    }),
                },
            }),
        );

        render(
            <SWRConfig value={{ provider: () => new Map() }}>
                <StoreContext.Provider value={store}>
                    <SplashPage />
                </StoreContext.Provider>
            </SWRConfig>,
        );

        await waitFor(
            () => {
                expect(mockPush).toHaveBeenCalledWith('/welcome');
            },
            { timeout: 2000 },
        );
    });
});
