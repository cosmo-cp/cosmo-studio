import { ipcMain } from 'electron';
import { injectable, multiInject } from 'inversify';
import {
    IPC_ARGS_SCHEMA_METADATA_KEY,
    IPC_CONTROLLER_METADATA_KEY,
    IPC_HANDLE_METADATA_KEY,
    IPC_ON_METADATA_KEY
} from './Decorators';
import { TYPES } from '../types';
import { Controller } from '../controllers/Controller';

@injectable()
export class IpcHandlerRegistry {
    constructor(@multiInject(TYPES.Controller) private readonly controllers: Controller[]) {}

    registerIpcHandlers(): void {
        this.controllers.forEach((controller) => {
            const controllerPrefix = Reflect.getMetadata(IPC_CONTROLLER_METADATA_KEY, controller.constructor);
            if (controllerPrefix === undefined) return;

            // Register @IpcHandle decorators
            const handleHandlers = Reflect.getMetadata(IPC_HANDLE_METADATA_KEY, controller.constructor);
            if (handleHandlers) {
                this.registerHandlers(controller, controllerPrefix, handleHandlers, (channel, listener) =>
                    ipcMain.handle(channel, listener),
                );
            }

            // Register @IpcOn decorators
            const onHandlers = Reflect.getMetadata(IPC_ON_METADATA_KEY, controller.constructor);
            if (onHandlers) {
                this.registerHandlers(controller, controllerPrefix, onHandlers, (channel, listener) =>
                    ipcMain.on(channel, listener),
                );
            }
        });
    }

    private registerHandlers(
        controller: Controller,
        prefix: string,
        handlers: Record<string, string>,
        registerFn: (
            channel: string,
            listener: (event: Electron.IpcMainEvent | Electron.IpcMainInvokeEvent, ...args: unknown[]) => unknown,
        ) => void,
    ): void {
        const argSchemas = Reflect.getMetadata(IPC_ARGS_SCHEMA_METADATA_KEY, controller.constructor) || {};
        for (const methodName in handlers) {
            if (Object.prototype.hasOwnProperty.call(handlers, methodName)) {
                const handlerName = handlers[methodName];
                const channel = `${prefix}:${handlerName}`;
                const argSchema = argSchemas[methodName];

                registerFn(channel, async (event, ...args) => {
                    const maybeMethod = (controller as Record<string, unknown>)[methodName];
                    if (typeof maybeMethod !== 'function') {
                        throw new Error(`IPC handler '${channel}' is not a function.`);
                    }

                    const method = maybeMethod as (...handlerArgs: unknown[]) => unknown;
                    const parsedArgs = argSchema ? argSchema.parse(args) : args;
                    // Pass the event object as the final argument to the handler method.
                    return method.apply(controller, [...parsedArgs, event]);
                });
            }
        }
    }
}
