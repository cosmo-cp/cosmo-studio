import { StoreProvider } from '@/app/store-provider';
import { getDropPickerAnchorPosition, getNodePositionFromDrop } from '@/components/workflow-canvas';
import { WorkflowPageContent } from '@/components/workflow-page-content';
import { createMockAppDataSource } from '@/test/mock-app-data-source';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'next-themes';
import { beforeAll, describe, expect, it } from 'vitest';

beforeAll(() => {
    class ResizeObserverMock {
        public observe() {}

        public unobserve() {}

        public disconnect() {}
    }

    globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addEventListener: () => undefined,
            removeEventListener: () => undefined,
            addListener: () => undefined,
            removeListener: () => undefined,
            dispatchEvent: () => false,
        }),
    });
});

function renderWorkflowPageContent() {
    return render(
        <StoreProvider appDataSource={createMockAppDataSource()}>
            <ThemeProvider attribute="class" forcedTheme="light">
                <WorkflowPageContent />
            </ThemeProvider>
        </StoreProvider>,
    );
}

// Start each workflow-focused test from the same created-workflow state.
async function createWorkflow(user: ReturnType<typeof userEvent.setup>) {
    renderWorkflowPageContent();

    expect(screen.getByText(/no workflows yet/i)).toBeInTheDocument();
    expect(screen.getByText(/start a new workflow/i)).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: /new workflow/i })[0]);

    expect(await screen.findByTestId('workflow-mode-toggle')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete untitled workflow/i })).toBeInTheDocument();
}

describe('WorkflowPageContent', () => {
    it('clamps drop-open picker placement and centers new nodes around the drop point', () => {
        const anchor = getDropPickerAnchorPosition({
            clientX: 600,
            clientY: 420,
            containerRect: {
                left: 100,
                top: 80,
                width: 640,
                height: 480,
            } as DOMRect,
        });

        expect(anchor).toEqual({ x: 392, y: 172 });
        expect(getNodePositionFromDrop({ x: 140, y: 120 })).toEqual({ x: 86, y: 99 });
        expect(getNodePositionFromDrop({ x: 10, y: 10 })).toEqual({ x: 24, y: 24 });
    });

    it('creates workflows from the history panel and toggles between edit and run modes', async () => {
        const user = userEvent.setup();

        await createWorkflow(user);

        expect(screen.getByTestId('workflow-mode-toggle')).toHaveClass(
            'top-4',
            'left-1/2',
            '-translate-x-1/2',
            'flex-row',
        );
        expect(await screen.findByRole('button', { name: /^edit$/i })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', { name: /^run$/i })).toHaveAttribute('aria-pressed', 'false');
        expect(screen.queryByText(/^edit$/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/^run$/i)).not.toBeInTheDocument();
        expect(screen.getByTestId('workflow-run-drawer')).toHaveAttribute('data-state', 'closed');
        expect(await screen.findByTestId('workflow-toolbar')).toBeInTheDocument();
        expect(screen.getByTestId('workflow-toolbar-panel')).toHaveStyle({
            top: '50%',
        });
        expect(screen.getByTestId('workflow-toolbar-handle')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /pointer mode/i })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', { name: /add node/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /hand mode/i })).toBeInTheDocument();
        expect(screen.queryByText(/^pointer$/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/^hand$/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/entry point for untitled workflow/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/run an ai-powered task or decision step/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/mark where a workflow path completes/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/start a new workflow/i)).not.toBeInTheDocument();
        expect(screen.getAllByText(/^start$/i)).not.toHaveLength(0);

        await user.click(screen.getByRole('button', { name: /^run$/i }));

        expect(screen.getByRole('button', { name: /^run$/i })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', { name: /^edit$/i })).toHaveAttribute('aria-pressed', 'false');
        expect(screen.getByTestId('workflow-run-drawer')).toHaveAttribute('data-state', 'open');
        expect(screen.queryByTestId('workflow-toolbar')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /close workflow runner/i })).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: /close workflow runner/i }));

        expect(screen.getByRole('button', { name: /^edit$/i })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', { name: /^run$/i })).toHaveAttribute('aria-pressed', 'false');
        expect(screen.getByTestId('workflow-run-drawer')).toHaveAttribute('data-state', 'closed');
        expect(await screen.findByTestId('workflow-toolbar')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: /^run$/i }));

        const workflowInput = screen.getByTestId('workflow-run-input');
        await user.click(workflowInput);
        await user.paste('Review the workflow execution path');
        await user.click(screen.getByRole('button', { name: /execute/i }));

        expect(screen.getByText('Review the workflow execution path')).toBeInTheDocument();
        expect(
            await screen.findByText('Started running "Untitled Workflow" with: Review the workflow execution path'),
        ).toBeInTheDocument();
        expect(workflowInput).toHaveValue('');

        await user.click(screen.getByRole('button', { name: /^edit$/i }));

        expect(await screen.findByTestId('workflow-toolbar')).toBeInTheDocument();
        expect(screen.getByTestId('workflow-run-drawer')).toHaveAttribute('data-state', 'closed');
    });

    it('opens the node picker, adds a node, and switches the canvas interaction mode', async () => {
        const user = userEvent.setup();

        await createWorkflow(user);

        await user.click(screen.getByRole('button', { name: /add node/i }));

        expect(screen.getByTestId('workflow-node-picker')).toBeInTheDocument();
        expect(screen.getByText(/^core$/i)).toBeInTheDocument();
        expect(screen.getByText(/^logic$/i)).toBeInTheDocument();
        expect(screen.getByText(/^tools$/i)).toBeInTheDocument();
        expect(screen.queryByText(/choose a workflow step to place on the canvas/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/route execution based on a classification result/i)).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /^start$/i })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /^agent$/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /^end$/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /^classify$/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /^if \/ else$/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /^loop$/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /^user approval$/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /^mcp$/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /^http$/i })).toBeInTheDocument();

        await user.hover(screen.getByRole('button', { name: /^classify$/i }));

        expect(
            (await screen.findAllByText(/route execution based on a classification result/i)).length,
        ).toBeGreaterThan(0);

        await user.unhover(screen.getByRole('button', { name: /^classify$/i }));

        await user.click(document.body);

        expect(screen.queryByTestId('workflow-node-picker')).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: /add node/i }));

        expect(screen.getByTestId('workflow-node-picker')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: /^http$/i }));

        expect(screen.queryByTestId('workflow-node-picker')).not.toBeInTheDocument();
        expect(screen.getAllByText(/^http$/i)).not.toHaveLength(0);
        expect(screen.getByLabelText(/http start connection/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/end end connection/i)).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: /hand mode/i }));

        expect(screen.getByRole('button', { name: /hand mode/i })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', { name: /pointer mode/i })).toHaveAttribute('aria-pressed', 'false');
        expect(screen.getByTestId('workflow-toolbar-panel')).toHaveStyle({
            transform: 'translate(0px, calc(-50% + 0px))',
        });
    });

    it('deletes workflows from the history panel', async () => {
        const user = userEvent.setup();

        await createWorkflow(user);

        await user.click(screen.getByRole('button', { name: /delete untitled workflow/i }));
        await user.click(screen.getByRole('button', { name: /^delete$/i }));

        expect(screen.getByText(/no workflows yet/i)).toBeInTheDocument();
        expect(screen.getByText(/start a new workflow/i)).toBeInTheDocument();
        expect(screen.queryByTestId('workflow-toolbar')).not.toBeInTheDocument();
    });
});
