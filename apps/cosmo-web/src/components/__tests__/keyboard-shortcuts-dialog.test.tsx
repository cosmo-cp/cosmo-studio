import { KeyboardShortcutsDialog } from '@/components/keyboard-shortcuts-dialog';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

describe('KeyboardShortcutsDialog', () => {
    it('renders shortcuts dialog when open is true', () => {
        const handleOpenChange = vi.fn();

        render(<KeyboardShortcutsDialog open={true} onOpenChange={handleOpenChange} />);

        expect(screen.getByRole('heading', { name: /keyboard shortcuts/i })).toBeInTheDocument();
        expect(screen.getByText('Toggle Sidebar')).toBeInTheDocument();
        expect(screen.getByText('Open Shortcuts')).toBeInTheDocument();
        expect(screen.getByText('Send message')).toBeInTheDocument();
        expect(screen.getByText('New line')).toBeInTheDocument();
        expect(screen.getByText('Mention Persona')).toBeInTheDocument();
        expect(screen.getByText('Insert Command')).toBeInTheDocument();
    });

    it('does not render dialog content when open is false', () => {
        render(<KeyboardShortcutsDialog open={false} onOpenChange={vi.fn()} />);

        expect(screen.queryByRole('heading', { name: /keyboard shortcuts/i })).not.toBeInTheDocument();
    });
});
