import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeAll, describe, expect, it} from 'vitest';
import {WorkflowPageContent} from '@/components/workflow-page-content';

beforeAll(() => {
    class ResizeObserverMock {
        public observe() {}

        public unobserve() {}

        public disconnect() {}
    }

    globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
});

describe('WorkflowPageContent', () => {
    it('creates workflows from the history panel and deletes them from the same list', async () => {
        const user = userEvent.setup();

        render(<WorkflowPageContent />);

        expect(screen.getByText(/no workflows yet/i)).toBeInTheDocument();
        expect(screen.getByText(/start a new workflow/i)).toBeInTheDocument();

        await user.click(screen.getAllByRole('button', {name: /new workflow/i})[0]);

        expect(await screen.findByText(/workflow canvas/i)).toBeInTheDocument();
        expect(screen.queryByText(/start a new workflow/i)).not.toBeInTheDocument();
        expect(screen.getByRole('button', {name: /delete untitled workflow/i})).toBeInTheDocument();

        await user.click(screen.getByRole('button', {name: /delete untitled workflow/i}));
        await user.click(screen.getByRole('button', {name: /^delete$/i}));

        expect(screen.getByText(/no workflows yet/i)).toBeInTheDocument();
        expect(screen.getByText(/start a new workflow/i)).toBeInTheDocument();
        expect(screen.queryByText(/workflow canvas/i)).not.toBeInTheDocument();
    });
});
