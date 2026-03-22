import 'reflect-metadata';

export const IPC_CONTROLLER_METADATA_KEY = 'ipc-controller';
export const IPC_HANDLE_METADATA_KEY = 'ipc-handle';
export const IPC_ON_METADATA_KEY = 'ipc-on';
export const IPC_RENDERER_ON_METADATA_KEY = 'ipc-renderer-on';

export function IpcController(prefix = ''): ClassDecorator {
    return (target) => {
        Reflect.defineMetadata(IPC_CONTROLLER_METADATA_KEY, prefix, target);
    };
}

function createHandlerDecorator(metadataKey: string) {
    return function (name: string): MethodDecorator {
        return (target, propertyKey) => {
            const handlers = Reflect.getMetadata(metadataKey, target.constructor) || {};
            handlers[propertyKey] = name;
            Reflect.defineMetadata(metadataKey, handlers, target.constructor);
        };
    };
}

export const IpcHandler = createHandlerDecorator(IPC_HANDLE_METADATA_KEY);
export const IpcOn = createHandlerDecorator(IPC_ON_METADATA_KEY);
export const IpcRendererOn = createHandlerDecorator(IPC_RENDERER_ON_METADATA_KEY);
