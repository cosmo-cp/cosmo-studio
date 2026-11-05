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

describe('task preload and http api', () => {
    it('delegates taskApi calls to ipcRenderer.invoke with correct channel and args', async () => {
        const { taskApi } = await import('../api/task');

        invokeMock.mockResolvedValueOnce([]);
        await taskApi.list({ status: 'in_progress' });
        expect(invokeMock).toHaveBeenCalledWith('task:list', { status: 'in_progress' });

        invokeMock.mockResolvedValueOnce({ id: '123' });
        await taskApi.get('123');
        expect(invokeMock).toHaveBeenCalledWith('task:get', '123');

        invokeMock.mockResolvedValueOnce({ id: '123' });
        await taskApi.create({
            title: 'T',
            description: 'D',
            workspacePath: '/w',
        });
        expect(invokeMock).toHaveBeenCalledWith('task:create', {
            title: 'T',
            description: 'D',
            workspacePath: '/w',
        });

        invokeMock.mockResolvedValueOnce({ id: '123' });
        await taskApi.update('123', { title: 'T2' });
        expect(invokeMock).toHaveBeenCalledWith('task:update', '123', { title: 'T2' });

        invokeMock.mockResolvedValueOnce({ id: '123', status: 'closed' });
        await taskApi.close('123');
        expect(invokeMock).toHaveBeenCalledWith('task:close', '123');

        invokeMock.mockResolvedValueOnce({ id: '123', status: 'done' });
        await taskApi.overrideStatus('123', 'done');
        expect(invokeMock).toHaveBeenCalledWith('task:overrideStatus', '123', 'done');

        invokeMock.mockResolvedValueOnce(undefined);
        await taskApi.link('123', '456');
        expect(invokeMock).toHaveBeenCalledWith('task:link', '123', '456');

        invokeMock.mockResolvedValueOnce(undefined);
        await taskApi.unlink('123');
        expect(invokeMock).toHaveBeenCalledWith('task:unlink', '123');

        invokeMock.mockResolvedValueOnce({ id: '123' });
        await taskApi.execute('123');
        expect(invokeMock).toHaveBeenCalledWith('task:execute', '123');

        invokeMock.mockResolvedValueOnce(undefined);
        await taskApi.cancel('123');
        expect(invokeMock).toHaveBeenCalledWith('task:cancel', '123');

        invokeMock.mockResolvedValueOnce([]);
        await taskApi.listComments('123');
        expect(invokeMock).toHaveBeenCalledWith('task:listComments', '123');

        invokeMock.mockResolvedValueOnce({ id: 'c1' });
        await taskApi.createComment('123', {
            authorType: 'human',
            authorLabel: 'User',
            content: 'Hello',
        });
        expect(invokeMock).toHaveBeenCalledWith('task:createComment', '123', {
            authorType: 'human',
            authorLabel: 'User',
            content: 'Hello',
        });
    });

    it('delegates taskHttpApi calls to HTTP RPC endpoint', async () => {
        const { stringify } = await import('superjson');
        const { taskHttpApi } = await import('../http-api/task');

        const envelope = { ok: true, result: [] };
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            text: async () => {
                return stringify(envelope);
            },
        });
        globalThis.fetch = fetchMock;

        await taskHttpApi.list({ status: 'done' });
        expect(fetchMock).toHaveBeenCalledWith(
            '/api/rpc/task/list',
            expect.objectContaining({
                method: 'POST',
                body: stringify({ args: [{ status: 'done' }] }),
            }),
        );

        await taskHttpApi.get('123');
        expect(fetchMock).toHaveBeenCalledWith(
            '/api/rpc/task/get',
            expect.objectContaining({
                body: stringify({ args: ['123'] }),
            }),
        );

        await taskHttpApi.create({ title: 'T', description: 'D', workspacePath: '/w' });
        expect(fetchMock).toHaveBeenCalledWith(
            '/api/rpc/task/create',
            expect.objectContaining({
                body: stringify({ args: [{ title: 'T', description: 'D', workspacePath: '/w' }] }),
            }),
        );

        await taskHttpApi.update('123', { title: 'T2' });
        expect(fetchMock).toHaveBeenCalledWith(
            '/api/rpc/task/update',
            expect.objectContaining({
                body: stringify({ args: ['123', { title: 'T2' }] }),
            }),
        );

        await taskHttpApi.close('123');
        expect(fetchMock).toHaveBeenCalledWith(
            '/api/rpc/task/close',
            expect.objectContaining({
                body: stringify({ args: ['123'] }),
            }),
        );

        await taskHttpApi.overrideStatus('123', 'done');
        expect(fetchMock).toHaveBeenCalledWith(
            '/api/rpc/task/overrideStatus',
            expect.objectContaining({
                body: stringify({ args: ['123', 'done'] }),
            }),
        );

        await taskHttpApi.link('123', '456');
        expect(fetchMock).toHaveBeenCalledWith(
            '/api/rpc/task/link',
            expect.objectContaining({
                body: stringify({ args: ['123', '456'] }),
            }),
        );

        await taskHttpApi.unlink('123');
        expect(fetchMock).toHaveBeenCalledWith(
            '/api/rpc/task/unlink',
            expect.objectContaining({
                body: stringify({ args: ['123'] }),
            }),
        );

        await taskHttpApi.execute('123');
        expect(fetchMock).toHaveBeenCalledWith(
            '/api/rpc/task/execute',
            expect.objectContaining({
                body: stringify({ args: ['123'] }),
            }),
        );

        await taskHttpApi.cancel('123');
        expect(fetchMock).toHaveBeenCalledWith(
            '/api/rpc/task/cancel',
            expect.objectContaining({
                body: stringify({ args: ['123'] }),
            }),
        );

        await taskHttpApi.listComments('123');
        expect(fetchMock).toHaveBeenCalledWith(
            '/api/rpc/task/listComments',
            expect.objectContaining({
                body: stringify({ args: ['123'] }),
            }),
        );

        await taskHttpApi.createComment('123', { authorType: 'human', authorLabel: 'User', content: 'Hi' });
        expect(fetchMock).toHaveBeenCalledWith(
            '/api/rpc/task/createComment',
            expect.objectContaining({
                body: stringify({ args: ['123', { authorType: 'human', authorLabel: 'User', content: 'Hi' }] }),
            }),
        );
    });
});
