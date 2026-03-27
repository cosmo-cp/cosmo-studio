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

        expect(await screen.findByTestId('workflow-toolbar')).toBeInTheDocument();
        expect(screen.getByTestId('workflow-toolbar-panel')).toHaveStyle({
            top: '50%',
        });
        expect(screen.getByTestId('workflow-toolbar-handle')).toBeInTheDocument();
        expect(screen.getByRole('button', {name: /pointer mode/i})).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', {name: /add node/i})).toBeInTheDocument();
        expect(screen.getByRole('button', {name: /hand mode/i})).toBeInTheDocument();
        expect(screen.queryByText(/^pointer$/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/^hand$/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/start a new workflow/i)).not.toBeInTheDocument();
        expect(screen.getByRole('button', {name: /delete untitled workflow/i})).toBeInTheDocument();

        await user.click(screen.getByRole('button', {name: /add node/i}));

        expect(screen.getByText(/node 1/i)).toBeInTheDocument();

        await user.click(screen.getByRole('button', {name: /hand mode/i}));

        expect(screen.getByRole('button', {name: /hand mode/i})).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', {name: /pointer mode/i})).toHaveAttribute('aria-pressed', 'false');
        expect(screen.getByTestId('workflow-toolbar-panel')).toHaveStyle({
            transform: 'translate(0px, calc(-50% + 0px))',
        });

        await user.click(screen.getByRole('button', {name: /delete untitled workflow/i}));
        await user.click(screen.getByRole('button', {name: /^delete$/i}));

        expect(screen.getByText(/no workflows yet/i)).toBeInTheDocument();
        expect(screen.getByText(/start a new workflow/i)).toBeInTheDocument();
        expect(screen.queryByTestId('workflow-toolbar')).not.toBeInTheDocument();
    });
});
