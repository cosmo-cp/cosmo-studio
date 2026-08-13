import { render, screen } from '@testing-library/react';
import type { ComponentProps, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import NotFoundPage from '../not-found';

const { appShellMock } = vi.hoisted(() => ({
    appShellMock: vi.fn(({ children }: { children: ReactNode }) => <div data-testid="app-shell">{children}</div>),
}));

vi.mock('@/components/app-shell', () => ({
    AppShell: appShellMock,
}));

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

describe('NotFoundPage', () => {
    it('renders the 404 content inside the shared app shell', () => {
        render(<NotFoundPage />);

        expect(appShellMock).toHaveBeenCalledTimes(1);
        expect(screen.getByTestId('app-shell')).toBeInTheDocument();
        expect(screen.getByText('404')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /page not found/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /go to chat/i })).toHaveAttribute('href', '/chat');
    });
});
