export interface CoreLogger {
    info(message: string, ...optionalParams: unknown[]): void;
    warn(message: string, ...optionalParams: unknown[]): void;
    error(message: string, ...optionalParams: unknown[]): void;
}

const consoleCoreLogger: CoreLogger = {
    info: (message, ...optionalParams) => {
        return console.info(message, ...optionalParams);
    },
    warn: (message, ...optionalParams) => {
        return console.warn(message, ...optionalParams);
    },
    error: (message, ...optionalParams) => {
        return console.error(message, ...optionalParams);
    },
};

let currentLogger: CoreLogger = consoleCoreLogger;

// Core is shared by Electron and HTTP, so runtime entrypoints install their logger here.
export function setCoreLogger(logger: CoreLogger): void {
    currentLogger = logger;
}

export function getCoreLogger(): CoreLogger {
    return currentLogger;
}
