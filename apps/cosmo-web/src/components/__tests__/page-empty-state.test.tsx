import { PageEmptyState } from '@/components/page-empty-state';
import { Button } from '@/components/ui/button';
import { render, screen } from '@testing-library/react';
import { MessageCirclePlus } from 'lucide-react';
import { describe, expect, it } from 'vitest';

describe('PageEmptyState', () => {
    it('renders the provided icon, copy, and optional action', () => {
        render(
            <PageEmptyState
                icon={MessageCirclePlus}
                title="Start a new Chat"
                description="Create or select a chat to continue."
                action={<Button>New Chat</Button>}
            />,
        );

        expect(screen.getByText('Start a new Chat')).toBeInTheDocument();
        expect(screen.getByText('Create or select a chat to continue.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'New Chat' })).toBeInTheDocument();
        expect(document.querySelector('svg')).not.toBeNull();
    });

    it('omits the action container when no action is provided', () => {
        render(
            <PageEmptyState
                icon={MessageCirclePlus}
                title="Select a Workflow"
                description="Choose a workflow from the history panel to open its canvas."
            />,
        );

        expect(screen.getByText('Select a Workflow')).toBeInTheDocument();
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
});
