import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Providers } from '../providers';

const { themeProviderMock, storeProviderMock } = vi.hoisted(() => ({
    themeProviderMock: vi.fn(({ children }: { children: ReactNode }) => (
        <div data-testid="theme-provider">{children}</div>
    )),
    storeProviderMock: vi.fn(({ children }: { children: ReactNode }) => (
        <section data-testid="store-provider">{children}</section>
    )),
}));

vi.mock('next-themes', () => ({
    ThemeProvider: themeProviderMock,
}));

vi.mock('@/app/store-provider', () => ({
    StoreProvider: storeProviderMock,
}));

describe('Providers', () => {
    it('wraps children with the store and theme providers in the expected order', () => {
        render(
            <Providers>
                <span data-testid="child">child</span>
            </Providers>,
        );

        expect(storeProviderMock).toHaveBeenCalledTimes(1);
        expect(themeProviderMock).toHaveBeenCalledTimes(1);
        expect(themeProviderMock.mock.calls[0][0]).toMatchObject({
            attribute: 'class',
            defaultTheme: 'system',
            enableSystem: true,
            disableTransitionOnChange: true,
        });
        expect(screen.getByTestId('store-provider')).toContainElement(screen.getByTestId('theme-provider'));
        expect(screen.getByTestId('theme-provider')).toContainElement(screen.getByTestId('child'));
    });
});
