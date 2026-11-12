import { StoreProvider } from '@/app/store-provider';
import {
    useCreateWorkspaceMutation,
    useDeleteWorkspaceMutation,
    useGetWorkspaceQuery,
    useGetWorkspacesQuery,
    usePickFolderMutation,
    useUpdateWorkspaceMutation,
} from '@/features/workspaces/workspaces-api';
import { createMockAppDataSource } from '@/test/mock-app-data-source';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { Workspace } from 'core/dto';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

const mockWorkspace: Workspace = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Test Project',
    canonicalPath: '/workspace/dir',
    rawPath: '/workspace/dir',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
};

function createWrapper(overrides = {}) {
    const dataSource = createMockAppDataSource(overrides);
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return <StoreProvider appDataSource={dataSource}>{children}</StoreProvider>;
    };
}

describe('workspaces-api hooks', () => {
    it('queries workspaces list', async () => {
        const listMock = vi.fn().mockResolvedValue([mockWorkspace]);
        const wrapper = createWrapper({
            workspace: { list: listMock },
        });

        const { result } = renderHook(() => useGetWorkspacesQuery(), { wrapper });

        await waitFor(() => {
            expect(result.current.data).toEqual([mockWorkspace]);
        });
        expect(listMock).toHaveBeenCalled();
    });

    it('queries a single workspace by id', async () => {
        const getMock = vi.fn().mockResolvedValue(mockWorkspace);
        const wrapper = createWrapper({
            workspace: { get: getMock },
        });

        const { result } = renderHook(() => useGetWorkspaceQuery(mockWorkspace.id), { wrapper });

        await waitFor(() => {
            expect(result.current.data).toEqual(mockWorkspace);
        });
        expect(getMock).toHaveBeenCalledWith(mockWorkspace.id);
    });

    it('creates a workspace with mutation', async () => {
        const createMock = vi.fn().mockResolvedValue(mockWorkspace);
        const wrapper = createWrapper({
            workspace: { create: createMock },
        });

        const { result } = renderHook(() => useCreateWorkspaceMutation(), { wrapper });

        let res: { data?: Workspace; error?: string } | undefined;
        await act(async () => {
            res = await result.current[0]({ path: '/workspace/dir', name: 'Test Project' });
        });

        expect(res?.data).toEqual(mockWorkspace);
        expect(createMock).toHaveBeenCalledWith({ path: '/workspace/dir', name: 'Test Project' });
    });

    it('updates a workspace with mutation', async () => {
        const updateMock = vi.fn().mockResolvedValue({ ...mockWorkspace, name: 'Renamed' });
        const wrapper = createWrapper({
            workspace: { update: updateMock },
        });

        const { result } = renderHook(() => useUpdateWorkspaceMutation(), { wrapper });

        let res: { data?: Workspace; error?: string } | undefined;
        await act(async () => {
            res = await result.current[0]({
                id: mockWorkspace.id,
                input: { name: 'Renamed' },
            });
        });

        expect(res?.data?.name).toBe('Renamed');
        expect(updateMock).toHaveBeenCalledWith(mockWorkspace.id, { name: 'Renamed' });
    });

    it('deletes a workspace with mutation', async () => {
        const deleteMock = vi.fn().mockResolvedValue(true);
        const wrapper = createWrapper({
            workspace: { delete: deleteMock },
        });

        const { result } = renderHook(() => useDeleteWorkspaceMutation(), { wrapper });

        let res: { data?: boolean; error?: string } | undefined;
        await act(async () => {
            res = await result.current[0](mockWorkspace.id);
        });

        expect(res?.data).toBe(true);
        expect(deleteMock).toHaveBeenCalledWith(mockWorkspace.id);
    });

    it('picks a folder using native dialog mutation', async () => {
        const pickFolderMock = vi.fn().mockResolvedValue('/native/folder/path');
        const wrapper = createWrapper({
            workspace: { pickFolder: pickFolderMock },
        });

        const { result } = renderHook(() => usePickFolderMutation(), { wrapper });

        let res: { data?: string | null; error?: string } | undefined;
        await act(async () => {
            res = await result.current[0](undefined as void);
        });

        expect(res?.data).toBe('/native/folder/path');
        expect(pickFolderMock).toHaveBeenCalled();
    });
});
