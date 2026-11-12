import { StoreProvider } from '@/app/store-provider';
import { WorkspaceManagement } from '@/components/workspace-management';
import { createMockAppDataSource } from '@/test/mock-app-data-source';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { Workspace } from 'core/dto';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockWorkspace: Workspace = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Frontend Web App',
    canonicalPath: '/Users/test/projects/frontend',
    rawPath: '~/projects/frontend',
    createdAt: new Date('2026-01-01T10:00:00Z'),
    updatedAt: new Date('2026-01-01T10:00:00Z'),
};

describe('WorkspaceManagement', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders empty state when no workspaces are registered', async () => {
        const appDataSource = createMockAppDataSource({
            workspace: {
                list: async () => [],
            },
        });

        render(
            <StoreProvider appDataSource={appDataSource}>
                <WorkspaceManagement />
            </StoreProvider>,
        );

        await waitFor(() => {
            expect(screen.getByText('No workspaces registered')).toBeInTheDocument();
            expect(screen.getByText('Add Your First Workspace')).toBeInTheDocument();
        });
    });

    it('renders workspace list table with registered workspaces', async () => {
        const appDataSource = createMockAppDataSource({
            workspace: {
                list: async () => [mockWorkspace],
            },
        });

        render(
            <StoreProvider appDataSource={appDataSource}>
                <WorkspaceManagement />
            </StoreProvider>,
        );

        await waitFor(() => {
            expect(screen.getByText('Frontend Web App')).toBeInTheDocument();
            expect(screen.getByText('/Users/test/projects/frontend')).toBeInTheDocument();
            expect(screen.getByLabelText('Edit Frontend Web App')).toBeInTheDocument();
            expect(screen.getByLabelText('Delete Frontend Web App')).toBeInTheDocument();
        });
    });

    it('opens create dialog and submits a new workspace', async () => {
        const createMock = vi.fn().mockResolvedValue({
            id: '22222222-2222-4222-8222-222222222222',
            name: 'Backend API',
            canonicalPath: '/Users/test/projects/backend',
            rawPath: '~/projects/backend',
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        const appDataSource = createMockAppDataSource({
            workspace: {
                list: async () => [],
                create: createMock,
            },
        });

        render(
            <StoreProvider appDataSource={appDataSource}>
                <WorkspaceManagement />
            </StoreProvider>,
        );

        await waitFor(() => {
            expect(screen.getByText('No workspaces registered')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('button', { name: /Add Workspace/i }));

        await waitFor(() => {
            expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        const pathInput = screen.getByPlaceholderText(/\/path\/to\/project or ~\/project/i);
        const nameInput = screen.getByPlaceholderText(/Leave empty to use folder name/i);

        fireEvent.change(pathInput, { target: { value: '/Users/test/projects/backend' } });
        fireEvent.change(nameInput, { target: { value: 'Backend API' } });

        const submitBtn = within(screen.getByRole('dialog')).getByRole('button', { name: /^Add Workspace$/i });
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(createMock).toHaveBeenCalledWith({
                name: 'Backend API',
                path: '/Users/test/projects/backend',
            });
        });
    });

    it('opens edit dialog and submits updates', async () => {
        const updateMock = vi.fn().mockResolvedValue({
            ...mockWorkspace,
            name: 'Renamed App',
        });

        const appDataSource = createMockAppDataSource({
            workspace: {
                list: async () => [mockWorkspace],
                update: updateMock,
            },
        });

        render(
            <StoreProvider appDataSource={appDataSource}>
                <WorkspaceManagement />
            </StoreProvider>,
        );

        await waitFor(() => {
            expect(screen.getByText('Frontend Web App')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByLabelText('Edit Frontend Web App'));

        await waitFor(() => {
            expect(screen.getByText('Edit Workspace')).toBeInTheDocument();
        });

        const nameInput = screen.getByPlaceholderText(/Leave empty to use folder name/i);
        fireEvent.change(nameInput, { target: { value: 'Renamed App' } });

        const updateBtn = within(screen.getByRole('dialog')).getByRole('button', { name: /^Update$/i });
        fireEvent.click(updateBtn);

        await waitFor(() => {
            expect(updateMock).toHaveBeenCalledWith(mockWorkspace.id, {
                name: 'Renamed App',
                path: '/Users/test/projects/frontend',
            });
        });
    });

    it('opens delete confirmation dialog and deletes workspace', async () => {
        const deleteMock = vi.fn().mockResolvedValue(true);

        const appDataSource = createMockAppDataSource({
            workspace: {
                list: async () => [mockWorkspace],
                delete: deleteMock,
            },
        });

        render(
            <StoreProvider appDataSource={appDataSource}>
                <WorkspaceManagement />
            </StoreProvider>,
        );

        await waitFor(() => {
            expect(screen.getByText('Frontend Web App')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByLabelText('Delete Frontend Web App'));

        await waitFor(() => {
            expect(screen.getByRole('heading', { name: 'Delete Workspace' })).toBeInTheDocument();
            expect(screen.getByText(/Are you sure you want to remove/i)).toBeInTheDocument();
        });

        const confirmDeleteBtn = within(screen.getByRole('dialog')).getByRole('button', {
            name: /^Delete Workspace$/i,
        });
        fireEvent.click(confirmDeleteBtn);

        await waitFor(() => {
            expect(deleteMock).toHaveBeenCalledWith(mockWorkspace.id);
        });
    });

    it('renders error sign when workspace folder is unavailable and refreshes on demand', async () => {
        const checkAllMock = vi.fn().mockResolvedValue({
            [mockWorkspace.id]: {
                reachable: false,
                error: 'Folder was deleted from disk',
            },
        });
        const checkSingleMock = vi.fn().mockResolvedValue({
            reachable: true,
            canonicalPath: '/Users/test/projects/frontend',
        });

        const appDataSource = createMockAppDataSource({
            workspace: {
                list: async () => [mockWorkspace],
                checkAllReachability: checkAllMock,
                checkReachability: checkSingleMock,
            },
        });

        render(
            <StoreProvider appDataSource={appDataSource}>
                <WorkspaceManagement />
            </StoreProvider>,
        );

        await waitFor(() => {
            expect(screen.getByText('Frontend Web App')).toBeInTheDocument();
            expect(screen.getByText('Unavailable')).toBeInTheDocument();
            expect(screen.getByTestId(`workspace-error-${mockWorkspace.id}`)).toBeInTheDocument();
        });

        // Click row refresh button
        const rowRefreshBtn = screen.getByLabelText('Refresh status for Frontend Web App');
        fireEvent.click(rowRefreshBtn);

        await waitFor(() => {
            expect(checkSingleMock).toHaveBeenCalledWith(mockWorkspace.id);
            expect(screen.getByText('Ready')).toBeInTheDocument();
        });

        // Click header Refresh Status button
        const headerRefreshBtn = screen.getByRole('button', { name: /^Refresh Status$/i });
        fireEvent.click(headerRefreshBtn);

        await waitFor(() => {
            expect(checkAllMock).toHaveBeenCalledTimes(2);
        });
    });

    it('triggers directory picker inside dialog', async () => {
        const pickFolderMock = vi.fn().mockResolvedValue('/Users/test/projects/picked');
        const appDataSource = createMockAppDataSource({
            workspace: {
                list: async () => [],
                pickFolder: pickFolderMock,
            },
        });

        render(
            <StoreProvider appDataSource={appDataSource}>
                <WorkspaceManagement />
            </StoreProvider>,
        );

        await waitFor(() => {
            expect(screen.getByText('Add Your First Workspace')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Add Your First Workspace'));

        await waitFor(() => {
            expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        const browseBtn = screen.getByRole('button', { name: /Browse/i });
        fireEvent.click(browseBtn);

        await waitFor(() => {
            expect(pickFolderMock).toHaveBeenCalled();
            expect(screen.getByDisplayValue('/Users/test/projects/picked')).toBeInTheDocument();
            expect(screen.getByDisplayValue('picked')).toBeInTheDocument();
        });
    });

    it('copies workspace path to clipboard', async () => {
        const writeTextMock = vi.fn().mockResolvedValue(undefined);
        Object.assign(navigator, {
            clipboard: {
                writeText: writeTextMock,
            },
        });

        const appDataSource = createMockAppDataSource({
            workspace: {
                list: async () => [mockWorkspace],
            },
        });

        render(
            <StoreProvider appDataSource={appDataSource}>
                <WorkspaceManagement />
            </StoreProvider>,
        );

        await waitFor(() => {
            expect(screen.getByText('Frontend Web App')).toBeInTheDocument();
        });

        const copyBtn = screen.getByLabelText(`Copy path for ${mockWorkspace.name}`);
        await act(async () => {
            fireEvent.click(copyBtn);
        });

        expect(writeTextMock).toHaveBeenCalledWith(mockWorkspace.canonicalPath);
    });

    it('displays error banner when listing workspaces fails', async () => {
        const appDataSource = createMockAppDataSource({
            workspace: {
                list: async () => {
                    throw new Error('Database unreachable');
                },
            },
        });

        render(
            <StoreProvider appDataSource={appDataSource}>
                <WorkspaceManagement />
            </StoreProvider>,
        );

        await waitFor(() => {
            expect(screen.getByText('Database unreachable')).toBeInTheDocument();
        });
    });
});
