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
        expect(screen.getAllByText(/^start$/i)).not.toHaveLength(0);
        expect(screen.getByRole('button', {name: /delete untitled workflow/i})).toBeInTheDocument();

        await user.click(screen.getByRole('button', {name: /add node/i}));

        expect(screen.getByTestId('workflow-node-picker')).toBeInTheDocument();
        expect(screen.getByText(/^core$/i)).toBeInTheDocument();
        expect(screen.getByText(/^logic$/i)).toBeInTheDocument();
        expect(screen.getByText(/^tools$/i)).toBeInTheDocument();
        expect(screen.queryByText(/choose a workflow step to place on the canvas/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/route execution based on a classification result/i)).not.toBeInTheDocument();
        expect(screen.queryByRole('button', {name: /^start$/i})).not.toBeInTheDocument();
        expect(screen.getByRole('button', {name: /^agent$/i})).toBeInTheDocument();
        expect(screen.getByRole('button', {name: /^end$/i})).toBeInTheDocument();
        expect(screen.getByRole('button', {name: /^classify$/i})).toBeInTheDocument();
        expect(screen.getByRole('button', {name: /^if \/ else$/i})).toBeInTheDocument();
        expect(screen.getByRole('button', {name: /^loop$/i})).toBeInTheDocument();
        expect(screen.getByRole('button', {name: /^user approval$/i})).toBeInTheDocument();
        expect(screen.getByRole('button', {name: /^mcp$/i})).toBeInTheDocument();
        expect(screen.getByRole('button', {name: /^http$/i})).toBeInTheDocument();

        await user.hover(screen.getByRole('button', {name: /^classify$/i}));

        expect((await screen.findAllByText(/route execution based on a classification result/i)).length).toBeGreaterThan(0);

        await user.unhover(screen.getByRole('button', {name: /^classify$/i}));

        await user.click(document.body);

        expect(screen.queryByTestId('workflow-node-picker')).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', {name: /add node/i}));

        expect(screen.getByTestId('workflow-node-picker')).toBeInTheDocument();

        await user.click(screen.getByRole('button', {name: /^http$/i}));

        expect(screen.queryByTestId('workflow-node-picker')).not.toBeInTheDocument();
        expect(screen.getAllByText(/^http$/i)).not.toHaveLength(0);
        expect(screen.getByLabelText(/http start connection/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/end end connection/i)).toBeInTheDocument();

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
