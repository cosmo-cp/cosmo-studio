import { describe, expect, it } from 'vitest';
import { isPathOverlapping, WorkspaceBusyError, WorkspaceExecutionLockService } from '../WorkspaceExecutionLockService';

describe('WorkspaceExecutionLockService', () => {
    describe('isPathOverlapping', () => {
        it('returns true for identical paths', () => {
            expect(isPathOverlapping('/a/b/c', '/a/b/c')).toBe(true);
        });

        it('returns true when pathA is parent of pathB', () => {
            expect(isPathOverlapping('/a/b', '/a/b/c/d')).toBe(true);
        });

        it('returns true when pathB is parent of pathA', () => {
            expect(isPathOverlapping('/a/b/c/d', '/a/b')).toBe(true);
        });

        it('returns false for disjoint siblings', () => {
            expect(isPathOverlapping('/a/b/proj1', '/a/b/proj2')).toBe(false);
        });

        it('returns false for unrelated roots', () => {
            expect(isPathOverlapping('/Users/project', '/tmp/project')).toBe(false);
        });
    });

    describe('WorkspaceExecutionLockService lease operations', () => {
        it('acquires and releases lease cleanly', () => {
            const lockService = new WorkspaceExecutionLockService();
            const wsPath = '/my/test/repo';

            expect(lockService.isWorkspaceBusy(wsPath)).toBe(false);
            lockService.acquireLease(wsPath, 'chat', 'chat-1');
            expect(lockService.isWorkspaceBusy(wsPath)).toBe(true);

            const active = lockService.getActiveLease(wsPath);
            expect(active).toBeDefined();
            expect(active?.ownerType).toBe('chat');
            expect(active?.ownerId).toBe('chat-1');

            const released = lockService.releaseLease(wsPath, 'chat-1');
            expect(released).toBe(true);
            expect(lockService.isWorkspaceBusy(wsPath)).toBe(false);
        });

        it('rejects duplicate lease acquisition by the same owner', () => {
            const lockService = new WorkspaceExecutionLockService();
            const wsPath = '/my/test/repo';

            lockService.acquireLease(wsPath, 'task', 'task-1');
            expect(() => {
                lockService.acquireLease(wsPath, 'task', 'task-1');
            }).toThrow(WorkspaceBusyError);

            lockService.releaseLease(wsPath, 'task-1');
            expect(lockService.isWorkspaceBusy(wsPath)).toBe(false);
        });

        it('throws WorkspaceBusyError if path is already leased by another owner', () => {
            const lockService = new WorkspaceExecutionLockService();
            const wsPath = '/my/test/repo';

            lockService.acquireLease(wsPath, 'task', 'task-1');

            expect(() => {
                lockService.acquireLease(wsPath, 'chat', 'chat-2');
            }).toThrow(WorkspaceBusyError);
        });

        it('throws WorkspaceBusyError when requesting a subfolder of an active lease', () => {
            const lockService = new WorkspaceExecutionLockService();
            const parentPath = '/my/test/repo';
            const childPath = '/my/test/repo/packages/core';

            lockService.acquireLease(parentPath, 'task', 'task-1');

            expect(() => {
                lockService.acquireLease(childPath, 'chat', 'chat-2');
            }).toThrow(WorkspaceBusyError);
        });

        it('throws WorkspaceBusyError when requesting a parent folder of an active lease', () => {
            const lockService = new WorkspaceExecutionLockService();
            const parentPath = '/my/test/repo';
            const childPath = '/my/test/repo/packages/core';

            lockService.acquireLease(childPath, 'chat', 'chat-1');

            expect(() => {
                lockService.acquireLease(parentPath, 'task', 'task-2');
            }).toThrow(WorkspaceBusyError);
        });

        it('allows concurrent leases on non-overlapping directories', () => {
            const lockService = new WorkspaceExecutionLockService();
            const dir1 = '/my/test/repo1';
            const dir2 = '/my/test/repo2';

            lockService.acquireLease(dir1, 'task', 'task-1');
            expect(() => {
                lockService.acquireLease(dir2, 'task', 'task-2');
            }).not.toThrow();

            expect(lockService.isWorkspaceBusy(dir1)).toBe(true);
            expect(lockService.isWorkspaceBusy(dir2)).toBe(true);

            lockService.releaseLease(dir1, 'task-1');
            lockService.releaseLease(dir2, 'task-2');
            expect(lockService.isWorkspaceBusy(dir1)).toBe(false);
            expect(lockService.isWorkspaceBusy(dir2)).toBe(false);
        });

        it('does not release lease if released by a different ownerId', () => {
            const lockService = new WorkspaceExecutionLockService();
            const wsPath = '/my/test/repo';

            lockService.acquireLease(wsPath, 'task', 'task-1');
            const released = lockService.releaseLease(wsPath, 'wrong-owner');
            expect(released).toBe(false);
            expect(lockService.isWorkspaceBusy(wsPath)).toBe(true);

            lockService.releaseLease(wsPath, 'task-1');
            expect(lockService.isWorkspaceBusy(wsPath)).toBe(false);
        });

        it('automatically releases lease when AbortSignal triggers', () => {
            const lockService = new WorkspaceExecutionLockService();
            const wsPath = '/my/test/repo';
            const controller = new AbortController();

            lockService.acquireLease(wsPath, 'chat', 'chat-1', controller.signal);
            expect(lockService.isWorkspaceBusy(wsPath)).toBe(true);

            controller.abort();
            expect(lockService.isWorkspaceBusy(wsPath)).toBe(false);
        });

        it('does not acquire lease if AbortSignal is already aborted', () => {
            const lockService = new WorkspaceExecutionLockService();
            const wsPath = '/my/test/repo';
            const controller = new AbortController();
            controller.abort();

            lockService.acquireLease(wsPath, 'chat', 'chat-1', controller.signal);
            expect(lockService.isWorkspaceBusy(wsPath)).toBe(false);
        });
    });
});
