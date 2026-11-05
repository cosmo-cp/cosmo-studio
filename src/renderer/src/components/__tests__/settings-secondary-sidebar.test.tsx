import { SettingsSecondarySidebar } from '@/components/settings-secondary-sidebar';
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
    return render(<SettingsSecondarySidebar />);
}

describe('SettingsSecondarySidebar', () => {
    it('renders both Workspace and Organization sections', () => {
        renderSidebar('/settings/provider');

        expect(screen.getByRole('heading', { level: 2, name: /settings/i })).toBeInTheDocument();
        expect(screen.getByText('Workspace')).toBeInTheDocument();
        expect(screen.getByText('Organization')).toBeInTheDocument();

        // Workspace items
        expect(screen.getByRole('link', { name: /general/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /providers/i })).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /models/i })).not.toBeInTheDocument();
        expect(screen.getByRole('link', { name: /agents/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /tools/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /mcp servers/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /persona/i })).toBeInTheDocument();

        // Organization items
        expect(screen.getByRole('link', { name: /usage & cost/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /projects/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /guardrails/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /team/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /billing/i })).toBeInTheDocument();
    });

    it('marks providers active when on /settings/provider', () => {
        renderSidebar('/settings/provider');

        const providersLink = screen.getByRole('link', { name: /providers/i });
        expect(providersLink).toHaveAttribute('data-active', 'true');
    });

    it('marks agents active when on /settings/agents', () => {
        renderSidebar('/settings/agents');

        const agentsLink = screen.getByRole('link', { name: /agents/i });
        expect(agentsLink).toHaveAttribute('data-active', 'true');
    });

    it('marks persona active when on /settings/persona', () => {
        renderSidebar('/settings/persona');

        const personaLink = screen.getByRole('link', { name: /persona/i });
        expect(personaLink).toHaveAttribute('data-active', 'true');
    });
});
