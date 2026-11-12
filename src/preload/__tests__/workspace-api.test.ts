import { describe, expect, it, vi } from 'vitest';

const invokeMock = vi.fn();
vi.mock('electron', () => {
    return {
        ipcRenderer: {
            invoke: (...args: unknown[]) => {
                return invokeMock(...args);
            },
        },
    };
});

describe('workspace preload and http api', () => {
    it('delegates workspaceApi calls to ipcRenderer.invoke with correct channel and args', async () => {
        const { workspaceApi } = await import('../api/workspace');

        invokeMock.mockResolvedValueOnce([]);
        await workspaceApi.list();
        expect(invokeMock).toHaveBeenCalledWith('workspace:list');

        invokeMock.mockResolvedValueOnce({ id: 'ws-1' });
        await workspaceApi.get('ws-1');
        expect(invokeMock).toHaveBeenCalledWith('workspace:get', 'ws-1');

        invokeMock.mockResolvedValueOnce({ id: 'ws-1' });
        await workspaceApi.create({ path: '/tmp/proj' });
        expect(invokeMock).toHaveBeenCalledWith('workspace:create', { path: '/tmp/proj' });

        invokeMock.mockResolvedValueOnce({ id: 'ws-1' });
        await workspaceApi.update('ws-1', { name: 'Renamed' });
        expect(invokeMock).toHaveBeenCalledWith('workspace:update', 'ws-1', { name: 'Renamed' });

        invokeMock.mockResolvedValueOnce(true);
        await workspaceApi.delete('ws-1');
        expect(invokeMock).toHaveBeenCalledWith('workspace:delete', 'ws-1');

        invokeMock.mockResolvedValueOnce('/picked/folder');
        await workspaceApi.pickFolder();
        expect(invokeMock).toHaveBeenCalledWith('workspace:pickFolder');

        invokeMock.mockResolvedValueOnce({ reachable: true });
        await workspaceApi.checkReachability('ws-1');
        expect(invokeMock).toHaveBeenCalledWith('workspace:checkReachability', 'ws-1');

        invokeMock.mockResolvedValueOnce({ 'ws-1': { reachable: true } });
        await workspaceApi.checkAllReachability();
        expect(invokeMock).toHaveBeenCalledWith('workspace:checkAllReachability');
    });

    it('delegates workspaceHttpApi calls through callRpc', async () => {
        const { workspaceHttpApi } = await import('../http-api/workspace');
        const common = await import('../api/common');
        const callRpcSpy = vi.spyOn(common, 'callRpc').mockResolvedValue([] as never);

        await workspaceHttpApi.list();
        expect(callRpcSpy).toHaveBeenCalledWith('workspace', 'list', []);

        callRpcSpy.mockResolvedValueOnce({ id: 'ws-1' } as never);
        await workspaceHttpApi.get('ws-1');
        expect(callRpcSpy).toHaveBeenCalledWith('workspace', 'get', ['ws-1']);

        callRpcSpy.mockResolvedValueOnce({ id: 'ws-1' } as never);
        await workspaceHttpApi.create({ path: '/tmp/proj' });
        expect(callRpcSpy).toHaveBeenCalledWith('workspace', 'create', [{ path: '/tmp/proj' }]);

        callRpcSpy.mockResolvedValueOnce({ id: 'ws-1' } as never);
        await workspaceHttpApi.update('ws-1', { name: 'Renamed' });
        expect(callRpcSpy).toHaveBeenCalledWith('workspace', 'update', ['ws-1', { name: 'Renamed' }]);

        callRpcSpy.mockResolvedValueOnce(true as never);
        await workspaceHttpApi.delete('ws-1');
        expect(callRpcSpy).toHaveBeenCalledWith('workspace', 'delete', ['ws-1']);

        callRpcSpy.mockResolvedValueOnce('/picked/folder' as never);
        await workspaceHttpApi.pickFolder();
        expect(callRpcSpy).toHaveBeenCalledWith('workspace', 'pickFolder', []);

        callRpcSpy.mockResolvedValueOnce({ reachable: true } as never);
        await workspaceHttpApi.checkReachability('ws-1');
        expect(callRpcSpy).toHaveBeenCalledWith('workspace', 'checkReachability', ['ws-1']);

        callRpcSpy.mockResolvedValueOnce({ 'ws-1': { reachable: true } } as never);
        await workspaceHttpApi.checkAllReachability();
        expect(callRpcSpy).toHaveBeenCalledWith('workspace', 'checkAllReachability', []);
    });
});
