import 'reflect-metadata';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IPC_CONTROLLER_METADATA_KEY, IPC_HANDLE_METADATA_KEY, IPC_ON_METADATA_KEY } from './Decorators';
import { IpcHandlerRegistry } from './index';

const ipcMain = vi.hoisted(() => {
    return {
        handle: vi.fn(),
        on: vi.fn(),
    };
});

vi.mock('electron', () => {
    return {
        ipcMain: ipcMain,
    };
});

describe('IpcHandlerRegistry', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('registers handle and on handlers and appends the event as the last arg', async () => {
        class ExampleController {
            handleMethod = vi.fn();
            onMethod = vi.fn();
        }

        Reflect.defineMetadata(IPC_CONTROLLER_METADATA_KEY, 'example', ExampleController);
        Reflect.defineMetadata(IPC_HANDLE_METADATA_KEY, { handleMethod: 'get' }, ExampleController);
        Reflect.defineMetadata(IPC_ON_METADATA_KEY, { onMethod: 'send' }, ExampleController);

        const controller = new ExampleController();
        const registry = new IpcHandlerRegistry([controller]);
        registry.registerIpcHandlers();

        expect(ipcMain.handle).toHaveBeenCalledWith('example:get', expect.any(Function));
        expect(ipcMain.on).toHaveBeenCalledWith('example:send', expect.any(Function));

        const invokeListener = (ipcMain.handle as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1];
        const event = { sender: {} } as never;
        await invokeListener(event, 'a', 1);
        expect(controller.handleMethod).toHaveBeenCalledWith('a', 1, event);
    });

    it('throws when the registered method is not a function', async () => {
        class BadController {
            notAFunction = 123;
        }

        Reflect.defineMetadata(IPC_CONTROLLER_METADATA_KEY, 'bad', BadController);
        Reflect.defineMetadata(IPC_HANDLE_METADATA_KEY, { notAFunction: 'boom' }, BadController);

        const controller = new BadController();
        const registry = new IpcHandlerRegistry([controller as never]);
        registry.registerIpcHandlers();

        const invokeListener = (ipcMain.handle as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1];
        await expect(invokeListener({} as never)).rejects.toThrow("IPC handler 'bad:boom' is not a function.");
    });

    it('ignores controllers without a prefix', () => {
        class NoPrefixController {
            method = vi.fn();
        }

        Reflect.defineMetadata(IPC_HANDLE_METADATA_KEY, { method: 'noop' }, NoPrefixController);

        const controller = new NoPrefixController();
        const registry = new IpcHandlerRegistry([controller as never]);
        registry.registerIpcHandlers();

        expect(ipcMain.handle).not.toHaveBeenCalled();
        expect(ipcMain.on).not.toHaveBeenCalled();
    });
});
