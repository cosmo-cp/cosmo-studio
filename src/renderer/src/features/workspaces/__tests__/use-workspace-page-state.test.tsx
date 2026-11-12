import { StoreProvider } from '@/app/store-provider';
import { useWorkspacePageState } from '@/features/workspaces/use-workspace-page-state';
import { createMockAppDataSource } from '@/test/mock-app-data-source';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { Workspace } from 'core/dto';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockWorkspace1: Workspace = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Workspace Alpha',
    canonicalPath: '/path/to/alpha',
    rawPath: '~/alpha',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
};

const mockWorkspace2: Workspace = {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Workspace Beta',
    canonicalPath: '/path/to/beta',
    rawPath: '/path/to/beta',
    createdAt: new Date('2026-01-02'),
    updatedAt: new Date('2026-01-02'),
};

describe('useWorkspacePageState', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('loads and lists registered workspaces', async () => {
        const appDataSource = createMockAppDataSource({
            workspace: {
                list: async () => [mockWorkspace1, mockWorkspace2],
            },
        });

        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <StoreProvider appDataSource={appDataSource}>{children}</StoreProvider>
        );

        const { result } = renderHook(() => useWorkspacePageState(), { wrapper });

        await waitFor(() => {
            expect(result.current.workspaces).toHaveLength(2);
            expect(result.current.workspaces[0].name).toBe('Workspace Alpha');
            expect(result.current.workspaces[1].name).toBe('Workspace Beta');
        });
    });

    it('opens create dialog with empty form and allows creating a workspace', async () => {
        let createdInput: { name?: string; path: string } | null = null;
        const appDataSource = createMockAppDataSource({
            workspace: {
                list: async () => [],
                create: async (input) => {
                    createdInput = input;
                    return {
                        id: '33333333-3333-4333-8333-333333333333',
                        name: input.name ?? 'test',
                        canonicalPath: input.path,
                        rawPath: input.path,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    };
                },
            },
        });

        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <StoreProvider appDataSource={appDataSource}>{children}</StoreProvider>
        );

        const { result } = renderHook(() => useWorkspacePageState(), { wrapper });

        act(() => {
            result.current.openCreateDialog();
        });

        expect(result.current.isDialogOpen).toBe(true);
        expect(result.current.editingWorkspace).toBeNull();
        expect(result.current.name).toBe('');
        expect(result.current.path).toBe('');

        act(() => {
            result.current.setName('My Project');
            result.current.setPath('/Users/dev/project');
        });

        await act(async () => {
            await result.current.saveWorkspace();
        });

        expect(createdInput).toEqual({
            name: 'My Project',
            path: '/Users/dev/project',
        });
        expect(result.current.isDialogOpen).toBe(false);
    });

    it('opens edit dialog with existing workspace data and saves updates', async () => {
        let updated: { id: string; input: { name?: string; path?: string } } | null = null;
        const appDataSource = createMockAppDataSource({
            workspace: {
                list: async () => [mockWorkspace1],
                update: async (id, input) => {
                    updated = { id, input };
                    return { ...mockWorkspace1, ...input };
                },
            },
        });

        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <StoreProvider appDataSource={appDataSource}>{children}</StoreProvider>
        );

        const { result } = renderHook(() => useWorkspacePageState(), { wrapper });

        await waitFor(() => {
            expect(result.current.workspaces).toHaveLength(1);
        });

        act(() => {
            result.current.openEditDialog(mockWorkspace1);
        });

        expect(result.current.isDialogOpen).toBe(true);
        expect(result.current.editingWorkspace).toEqual(mockWorkspace1);
        expect(result.current.name).toBe('Workspace Alpha');
        expect(result.current.path).toBe('/path/to/alpha');

        act(() => {
            result.current.setName('Updated Alpha');
        });

        await act(async () => {
            await result.current.saveWorkspace();
        });

        expect(updated).toEqual({
            id: mockWorkspace1.id,
            input: {
                name: 'Updated Alpha',
                path: '/path/to/alpha',
            },
        });
        expect(result.current.isDialogOpen).toBe(false);
    });

    it('confirms and deletes a workspace', async () => {
        let deletedId: string | null = null;
        const appDataSource = createMockAppDataSource({
            workspace: {
                list: async () => [mockWorkspace1],
                delete: async (id) => {
                    deletedId = id;
                    return true;
                },
            },
        });

        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <StoreProvider appDataSource={appDataSource}>{children}</StoreProvider>
        );

        const { result } = renderHook(() => useWorkspacePageState(), { wrapper });

        await waitFor(() => {
            expect(result.current.workspaces).toHaveLength(1);
        });

        act(() => {
            result.current.openDeleteDialog(mockWorkspace1);
        });

        expect(result.current.isDeleteDialogOpen).toBe(true);
        expect(result.current.deletingWorkspace).toEqual(mockWorkspace1);

        await act(async () => {
            await result.current.confirmDelete();
        });

        expect(deletedId).toBe(mockWorkspace1.id);
        expect(result.current.isDeleteDialogOpen).toBe(false);
        expect(result.current.deletingWorkspace).toBeNull();
    });

    it('handles folder picking and derives workspace name', async () => {
        const appDataSource = createMockAppDataSource({
            workspace: {
                list: async () => [],
                pickFolder: async () => '/Users/dev/repos/my-cool-app',
            },
        });

        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <StoreProvider appDataSource={appDataSource}>{children}</StoreProvider>
        );

        const { result } = renderHook(() => useWorkspacePageState(), { wrapper });

        act(() => {
            result.current.openCreateDialog();
        });

        await act(async () => {
            await result.current.handlePickFolder();
        });

        expect(result.current.path).toBe('/Users/dev/repos/my-cool-app');
        expect(result.current.name).toBe('my-cool-app');
    });

    it('handles clipboard copy for workspace canonical path', async () => {
        const writeTextMock = vi.fn().mockResolvedValue(undefined);
        Object.assign(navigator, {
            clipboard: {
                writeText: writeTextMock,
            },
        });

        const appDataSource = createMockAppDataSource({
            workspace: {
                list: async () => [mockWorkspace1],
            },
        });

        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <StoreProvider appDataSource={appDataSource}>{children}</StoreProvider>
        );

        const { result } = renderHook(() => useWorkspacePageState(), { wrapper });

        await act(async () => {
            await result.current.handleCopyPath(mockWorkspace1);
        });

        expect(writeTextMock).toHaveBeenCalledWith('/path/to/alpha');
        expect(result.current.copiedWorkspaceId).toBe(mockWorkspace1.id);
    });

    it('refreshes reachability for all workspaces and individual workspace', async () => {
        const checkAllMock = vi.fn().mockResolvedValue({
            [mockWorkspace1.id]: { reachable: true, canonicalPath: '/path/to/alpha' },
            [mockWorkspace2.id]: { reachable: false, error: 'Directory does not exist' },
        });
        const checkSingleMock = vi.fn().mockResolvedValue({
            reachable: false,
            error: 'Path is inaccessible',
        });

        const appDataSource = createMockAppDataSource({
            workspace: {
                list: async () => [mockWorkspace1, mockWorkspace2],
                checkAllReachability: checkAllMock,
                checkReachability: checkSingleMock,
            },
        });

        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <StoreProvider appDataSource={appDataSource}>{children}</StoreProvider>
        );

        const { result } = renderHook(() => useWorkspacePageState(), { wrapper });

        await waitFor(() => {
            expect(checkAllMock).toHaveBeenCalled();
            expect(result.current.reachabilityMap[mockWorkspace1.id]?.reachable).toBe(true);
            expect(result.current.reachabilityMap[mockWorkspace2.id]?.reachable).toBe(false);
            expect(result.current.reachabilityMap[mockWorkspace2.id]?.error).toBe('Directory does not exist');
        });

        await act(async () => {
            await result.current.refreshWorkspaceStatus(mockWorkspace1.id);
        });

        expect(checkSingleMock).toHaveBeenCalledWith(mockWorkspace1.id);
        expect(result.current.reachabilityMap[mockWorkspace1.id]?.reachable).toBe(false);
        expect(result.current.reachabilityMap[mockWorkspace1.id]?.error).toBe('Path is inaccessible');
    });

    it('validates empty path and handles backend errors during save', async () => {
        const appDataSource = createMockAppDataSource({
            workspace: {
                list: async () => [],
                create: async () => {
                    throw new Error('Directory is invalid');
                },
                update: async () => {
                    throw new Error('Update failed');
                },
            },
        });

        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <StoreProvider appDataSource={appDataSource}>{children}</StoreProvider>
        );

        const { result } = renderHook(() => useWorkspacePageState(), { wrapper });

        // Empty path validation
        act(() => {
            result.current.openCreateDialog();
        });

        await act(async () => {
            await result.current.saveWorkspace();
        });

        expect(result.current.errorMessage).toBe('Folder path is required.');

        // Backend create error
        act(() => {
            result.current.setPath('/some/path');
        });

        await act(async () => {
            await result.current.saveWorkspace();
        });

        expect(result.current.errorMessage).toBe('Directory is invalid');

        // Backend update error
        act(() => {
            result.current.openEditDialog(mockWorkspace1);
        });

        await act(async () => {
            await result.current.saveWorkspace();
        });

        expect(result.current.errorMessage).toBe('Update failed');

        // Close dialog resets form
        act(() => {
            result.current.closeDialog();
        });
        expect(result.current.isDialogOpen).toBe(false);
        expect(result.current.errorMessage).toBeNull();
    });

    it('handles clipboard failure gracefully', async () => {
        Object.assign(navigator, {
            clipboard: {
                writeText: vi.fn().mockRejectedValue(new Error('Clipboard blocked')),
            },
        });

        const appDataSource = createMockAppDataSource({
            workspace: {
                list: async () => [mockWorkspace1],
            },
        });

        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <StoreProvider appDataSource={appDataSource}>{children}</StoreProvider>
        );

        const { result } = renderHook(() => useWorkspacePageState(), { wrapper });

        await act(async () => {
            await result.current.handleCopyPath(mockWorkspace1);
        });

        expect(result.current.copiedWorkspaceId).toBeNull();
    });

    it('closes delete dialog without deleting when cancelled', async () => {
        const appDataSource = createMockAppDataSource({
            workspace: {
                list: async () => [mockWorkspace1],
            },
        });

        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <StoreProvider appDataSource={appDataSource}>{children}</StoreProvider>
        );

        const { result } = renderHook(() => useWorkspacePageState(), { wrapper });

        act(() => {
            result.current.openDeleteDialog(mockWorkspace1);
        });
        expect(result.current.isDeleteDialogOpen).toBe(true);

        act(() => {
            result.current.closeDeleteDialog();
        });
        expect(result.current.isDeleteDialogOpen).toBe(false);
        expect(result.current.deletingWorkspace).toBeNull();
    });
});
