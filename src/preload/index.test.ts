import { describe, expect, it, vi } from 'vitest';

const exposeInMainWorld = vi.fn();
const invoke = vi.fn();
const send = vi.fn();
const on = vi.fn();
const removeAllListeners = vi.fn();

vi.mock('electron', () => {
    return {
        contextBridge: {
            exposeInMainWorld: exposeInMainWorld,
        },
        ipcRenderer: {
            invoke: invoke,
            send: send,
            on: on,
            removeAllListeners: removeAllListeners,
        },
    };
});

vi.mock('electron-log/renderer', () => {
    return {
        default: {
            scope: vi.fn(() => {
                return {
                    info: vi.fn(),
                };
            }),
        },
    };
});

describe('preload index', () => {
    it('exposes the API surface to the renderer', async () => {
        const { rpcApi } = await import('./rpc-api');
        await import('./index');

        expect(exposeInMainWorld).toHaveBeenCalledWith('api', rpcApi);
        expect(Object.keys(rpcApi)).toEqual([
            'chat',
            'modelProvider',
            'message',
            'persona',
            'command',
            'mcpServer',
            'webSearch',
            'workflow',
            'acpAgent',
            'streaming',
        ]);
        expect(rpcApi).not.toHaveProperty('ipcRenderer');
    });

    it('wires streaming listeners and removes them', async () => {
        const { rpcApi } = await import('./rpc-api');

        const onDataListener = vi.fn();
        rpcApi.streaming.onData('chan', onDataListener);
        expect(on).toHaveBeenCalledWith('chan-data', expect.any(Function));
        const onDataSubscription = on.mock.calls.find(([channel]) => {
            return channel === 'chan-data';
        })?.[1];
        expect(onDataSubscription).toEqual(expect.any(Function));
        (onDataSubscription as unknown as (event: unknown, data: unknown) => void)({}, { chunk: 1 });
        expect(onDataListener).toHaveBeenCalledWith({ chunk: 1 });

        const onEndListener = vi.fn();
        rpcApi.streaming.onEnd('chan', onEndListener);
        expect(on).toHaveBeenCalledWith('chan-end', onEndListener);

        const onErrorListener = vi.fn();
        rpcApi.streaming.onError('chan', onErrorListener);
        expect(on).toHaveBeenCalledWith('chan-error', expect.any(Function));

        const subscription = on.mock.calls.find(([channel]) => {
            return channel === 'chan-error';
        })?.[1];
        expect(subscription).toEqual(expect.any(Function));
        (subscription as unknown as (event: unknown, error: unknown) => void)({}, 'boom');
        expect(onErrorListener).toHaveBeenCalledWith('boom');

        rpcApi.streaming.removeListeners('chan');
        expect(removeAllListeners).toHaveBeenCalledWith('chan-error');
        expect(removeAllListeners).toHaveBeenCalledWith('chan-end');
        expect(removeAllListeners).toHaveBeenCalledWith('chan-data');
    });
});
