import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import RootLayout from '../layout';

const { providersMock } = vi.hoisted(() => ({
    providersMock: vi.fn(({ children }: { children: ReactNode }) => <div data-testid="providers">{children}</div>),
}));

vi.mock('../providers', () => ({
    Providers: providersMock,
}));

describe('RootLayout', () => {
    it('keeps the root html server-rendered and suppresses hydration warnings for theme attributes', () => {
        const tree = RootLayout({ children: <main data-testid="content">content</main> });

        expect(tree.type).toBe('html');
        expect(tree.props.lang).toBe('en');
        expect(tree.props.suppressHydrationWarning).toBe(true);
        expect(tree.props['data-scroll-behavior']).toBe('smooth');

        const body = tree.props.children;
        expect(body.type).toBe('body');

        const providers = body.props.children;
        expect(providers.type).toBe(providersMock);
        expect(providers.props.children.type).toBe('main');
    });
});
