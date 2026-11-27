import type { StreamingApi } from '../contracts/streaming';

export const streamingHttpApi: StreamingApi = {
    sendMessage: () => {
        throw new Error('Streaming is handled by createChatTransport() in HTTP builds.');
    },
    abortMessage: () => {
        throw new Error('Streaming is handled by createChatTransport() in HTTP builds.');
    },
    runStreamStart: () => {
        throw new Error('Workflow streaming is not available through the HTTP RPC client.');
    },
    runStreamAbort: () => {
        throw new Error('Workflow streaming is not available through the HTTP RPC client.');
    },
    onData: () => {
        return undefined;
    },
    onEnd: () => {
        return undefined;
    },
    onError: () => {
        return undefined;
    },
    removeListeners: () => {
        return undefined;
    },
};
