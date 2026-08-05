import type { UIMessageChunk } from 'ai';
import { ipcRenderer } from 'electron';
import type {
    ChatAbortArgs,
    ChatSendMessageArgs,
    WorkflowRunStreamAbortArgs,
    WorkflowRunStreamStartArgs,
} from '../../../packages/core/dto';
import type { StreamingApi } from '../contracts/streaming';

export const streamingApi: StreamingApi = {
    sendMessage: (args: ChatSendMessageArgs) => {
        return ipcRenderer.send('streamingChat:sendMessage', args);
    },
    abortMessage: (args: ChatAbortArgs) => {
        return ipcRenderer.send('streamingChat:abortMessage', args);
    },
    runStreamStart: (input: WorkflowRunStreamStartArgs) => {
        return ipcRenderer.send('workflow:run.stream.start', input);
    },
    runStreamAbort: (input: WorkflowRunStreamAbortArgs) => {
        return ipcRenderer.send('workflow:run.stream.abort', input);
    },
    onData: (channel: string, listener: (data: UIMessageChunk) => void) => {
        const subscription = (_event: unknown, data: UIMessageChunk) => {
            return listener(data);
        };
        ipcRenderer.on(`${channel}-data`, subscription);
    },
    onEnd: (channel: string, listener: () => void) => {
        ipcRenderer.on(`${channel}-end`, listener);
    },
    onError: (channel: string, listener: (error: unknown) => void) => {
        const subscription = (_event: unknown, error: unknown) => {
            return listener(error);
        };
        ipcRenderer.on(`${channel}-error`, subscription);
    },
    removeListeners: (channel: string) => {
        ipcRenderer.removeAllListeners(`${channel}-error`);
        ipcRenderer.removeAllListeners(`${channel}-end`);
        ipcRenderer.removeAllListeners(`${channel}-data`);
    },
};
