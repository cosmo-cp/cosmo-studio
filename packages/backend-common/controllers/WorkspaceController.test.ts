import type { Workspace } from 'core/dto';
import type { FolderPickerService } from 'core/platform/FolderPickerService';
import type { WorkspaceService } from 'core/services/WorkspaceService';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AcpAgentRuntimeService } from '../services/AcpAgentRuntimeService';
import type { WorkspaceExecutionLockService } from '../services/WorkspaceExecutionLockService';
import { WorkspaceController } from './WorkspaceController';

describe('WorkspaceController', () => {
    let controller: WorkspaceController;
    let mockWorkspaceService: {
        list: ReturnType<typeof vi.fn>;
        get: ReturnType<typeof vi.fn>;
        create: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
        delete: ReturnType<typeof vi.fn>;
        validateReachability: ReturnType<typeof vi.fn>;
    };
    let mockFolderPickerService: {
        pickDirectory: ReturnType<typeof vi.fn>;
    };
    let mockLockService: {
        isWorkspaceBusy: ReturnType<typeof vi.fn>;
    };
    let mockAcpAgentRuntimeService: {
        evictWorkspace: ReturnType<typeof vi.fn>;
    };

    const sampleWorkspace: Workspace = {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Project Alpha',
        canonicalPath: '/path/alpha',
        rawPath: '/path/alpha',
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    beforeEach(() => {
        mockWorkspaceService = {
            list: vi.fn().mockResolvedValue([sampleWorkspace]),
            get: vi.fn().mockResolvedValue(sampleWorkspace),
            create: vi.fn().mockResolvedValue(sampleWorkspace),
            update: vi.fn().mockResolvedValue({ ...sampleWorkspace, name: 'Updated Alpha' }),
            delete: vi.fn().mockResolvedValue(true),
            validateReachability: vi.fn().mockResolvedValue({ reachable: true, canonicalPath: '/path/alpha' }),
        };
        mockFolderPickerService = {
            pickDirectory: vi.fn().mockResolvedValue('/selected/folder'),
        };
        mockLockService = {
            isWorkspaceBusy: vi.fn().mockReturnValue(false),
        };
        mockAcpAgentRuntimeService = {
            evictWorkspace: vi.fn(),
        };

        controller = new WorkspaceController(
            mockWorkspaceService as unknown as WorkspaceService,
            mockFolderPickerService as unknown as FolderPickerService,
            mockLockService as unknown as WorkspaceExecutionLockService,
            mockAcpAgentRuntimeService as unknown as AcpAgentRuntimeService,
        );
    });

    it('lists all workspaces', async () => {
        const result = await controller.list();
        expect(result).toEqual([sampleWorkspace]);
        expect(mockWorkspaceService.list).toHaveBeenCalled();
    });

    it('gets a workspace by id', async () => {
        const result = await controller.get(sampleWorkspace.id);
        expect(result).toEqual(sampleWorkspace);
        expect(mockWorkspaceService.get).toHaveBeenCalledWith(sampleWorkspace.id);
    });

    it('creates a workspace', async () => {
        const input = { name: 'New Project', path: '/path/new' };
        const result = await controller.create(input);
        expect(result).toEqual(sampleWorkspace);
        expect(mockWorkspaceService.create).toHaveBeenCalledWith(input);
    });

    it('updates a workspace name without evicting', async () => {
        const result = await controller.update(sampleWorkspace.id, { name: 'Updated Alpha' });
        expect(result.name).toBe('Updated Alpha');
        expect(mockWorkspaceService.update).toHaveBeenCalledWith(sampleWorkspace.id, { name: 'Updated Alpha' });
        expect(mockAcpAgentRuntimeService.evictWorkspace).not.toHaveBeenCalled();
    });

    it('updates a workspace path and evicts old subprocesses', async () => {
        await controller.update(sampleWorkspace.id, { path: '/new/path' });
        expect(mockWorkspaceService.update).toHaveBeenCalledWith(sampleWorkspace.id, { path: '/new/path' });
        expect(mockAcpAgentRuntimeService.evictWorkspace).toHaveBeenCalledWith(sampleWorkspace.canonicalPath);
    });

    it('throws when updating non-existent workspace', async () => {
        mockWorkspaceService.get.mockResolvedValue(undefined);
        await expect(controller.update('missing-id', { name: 'New' })).rejects.toThrow('Workspace not found');
    });

    it('throws when relocating a workspace that is currently in use', async () => {
        mockLockService.isWorkspaceBusy.mockReturnValue(true);
        await expect(controller.update(sampleWorkspace.id, { path: '/new/path' })).rejects.toThrow(
            'it is currently in use',
        );
    });

    it('deletes a workspace and evicts subprocesses', async () => {
        const result = await controller.delete(sampleWorkspace.id);
        expect(result).toBe(true);
        expect(mockAcpAgentRuntimeService.evictWorkspace).toHaveBeenCalledWith(sampleWorkspace.canonicalPath);
        expect(mockWorkspaceService.delete).toHaveBeenCalledWith(sampleWorkspace.id);
    });

    it('returns false when deleting a non-existent workspace', async () => {
        mockWorkspaceService.get.mockResolvedValue(undefined);
        const result = await controller.delete('missing-id');
        expect(result).toBe(false);
        expect(mockWorkspaceService.delete).not.toHaveBeenCalled();
    });

    it('throws when deleting a workspace that is currently in use', async () => {
        mockLockService.isWorkspaceBusy.mockReturnValue(true);
        await expect(controller.delete(sampleWorkspace.id)).rejects.toThrow('it is currently in use');
    });

    it('picks a folder using platform service', async () => {
        const result = await controller.pickFolder();
        expect(result).toBe('/selected/folder');
        expect(mockFolderPickerService.pickDirectory).toHaveBeenCalled();
    });

    it('checks reachability of a single workspace', async () => {
        const result = await controller.checkReachability(sampleWorkspace.id);
        expect(result).toEqual({ reachable: true, canonicalPath: '/path/alpha' });
        expect(mockWorkspaceService.validateReachability).toHaveBeenCalledWith(sampleWorkspace.id);
    });

    it('checks reachability of all workspaces', async () => {
        const result = await controller.checkAllReachability();
        expect(result).toEqual({
            [sampleWorkspace.id]: { reachable: true, canonicalPath: '/path/alpha' },
        });
        expect(mockWorkspaceService.validateReachability).toHaveBeenCalledWith(sampleWorkspace.id);
    });
});
