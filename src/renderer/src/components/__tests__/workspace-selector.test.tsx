import { StoreProvider } from '@/app/store-provider';
import { WorkspaceSelector } from '@/components/workspace-selector';
import { createMockAppDataSource } from '@/test/mock-app-data-source';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Workspace } from 'core/dto';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

const sampleWorkspaces: Workspace[] = [
    {
        id: 'ws-1',
        name: 'Alpha Project',
        canonicalPath: '/repos/alpha',
        rawPath: '/repos/alpha',
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        id: 'ws-2',
        name: 'Beta Project',
        canonicalPath: '/repos/beta',
        rawPath: '/repos/beta',
        createdAt: new Date(),
        updatedAt: new Date(),
    },
];

function renderWithStore(ui: React.ReactElement, overrides = {}) {
    const dataSource = createMockAppDataSource({
        workspace: {
            list: vi.fn().mockResolvedValue(sampleWorkspaces),
            ...overrides,
        },
    });
    return render(<StoreProvider appDataSource={dataSource}>{ui}</StoreProvider>);
}

describe('WorkspaceSelector', () => {
    it('renders placeholder when no value is provided', async () => {
        renderWithStore(<WorkspaceSelector value={null} placeholder="Choose folder" />);

        expect(screen.getByText('Choose folder')).toBeDefined();
    });

    it('renders selected workspace name', async () => {
        renderWithStore(<WorkspaceSelector value="ws-1" />);

        await waitFor(() => {
            expect(screen.getByText('Alpha Project')).toBeDefined();
        });
    });

    it('renders locked state when locked is true', async () => {
        renderWithStore(
            <WorkspaceSelector value="ws-1" locked={true} lockedReason="Thread is bound to this directory" />,
        );

        await waitFor(() => {
            expect(screen.getByText('Alpha Project')).toBeDefined();
        });
        expect(screen.getByText('Locked')).toBeDefined();
    });

    it('opens dropdown menu and selects a workspace', async () => {
        const handleChange = vi.fn();
        renderWithStore(<WorkspaceSelector value="ws-1" onChange={handleChange} />);

        await waitFor(() => {
            expect(screen.getByText('Alpha Project')).toBeDefined();
        });

        const trigger = screen.getByRole('button');
        fireEvent.pointerDown(trigger, { button: 0 });

        await waitFor(() => {
            expect(screen.getByText('Beta Project')).toBeDefined();
        });

        fireEvent.click(screen.getByText('Beta Project'));
        expect(handleChange).toHaveBeenCalledWith('ws-2');
    });

    it('opens Add Folder dialog and creates a new workspace', async () => {
        const createMock = vi.fn().mockResolvedValue({
            id: 'ws-new',
            name: 'New Project',
            canonicalPath: '/repos/new',
            rawPath: '/repos/new',
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        const handleChange = vi.fn();

        renderWithStore(<WorkspaceSelector onChange={handleChange} />, { create: createMock });

        const trigger = screen.getByRole('button');
        fireEvent.pointerDown(trigger, { button: 0 });

        await waitFor(() => {
            expect(screen.getByText('Add Folder...')).toBeDefined();
        });

        fireEvent.click(screen.getByText('Add Folder...'));

        await waitFor(() => {
            expect(screen.getByRole('heading', { name: 'Add Workspace' })).toBeDefined();
        });

        const pathInput = screen.getByPlaceholderText('/path/to/project or ~/project');
        fireEvent.change(pathInput, { target: { value: '/repos/new' } });

        const submitBtn = screen.getByRole('button', { name: 'Add Workspace' });
        await act(async () => {
            fireEvent.click(submitBtn);
        });

        await waitFor(() => {
            expect(createMock).toHaveBeenCalledWith({
                path: '/repos/new',
                name: undefined,
            });
            expect(handleChange).toHaveBeenCalledWith('ws-new');
        });
    });
});
