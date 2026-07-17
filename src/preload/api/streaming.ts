import { ipcRenderer } from 'electron';
import type {ChatAbortArgs, ChatSendMessageArgs, WorkflowRunStreamStartArgs, WorkflowRunStreamAbortArgs} from '../../packages/core/dto';
import type {UIMessageChunk} from 'ai';

export interface StreamingApi {
    sendMessage(args: ChatSendMessageArgs): void;
    abortMessage(args: ChatAbortArgs): void;
    runStreamStart(input: WorkflowRunStreamStartArgs): void;
    runStreamAbort(input: WorkflowRunStreamAbortArgs): void;
    onData: (channel: string, listener: (data: UIMessageChunk) => void) => void;
    onEnd: (channel: string, listener: () => void) => void;
    onError: (channel: string, listener: (error: unknown) => void) => void;
    removeListeners: (channel: string) => void;
}

export const streamingApi: StreamingApi = {
    sendMessage: (args: ChatSendMessageArgs) => ipcRenderer.send('streamingChat:sendMessage', args),
    abortMessage: (args: ChatAbortArgs) => ipcRenderer.send('streamingChat:abortMessage', args),
    runStreamStart: (input: WorkflowRunStreamStartArgs) => ipcRenderer.send('workflow:run.stream.start', input),
    runStreamAbort: (input: WorkflowRunStreamAbortArgs) => ipcRenderer.send('workflow:run.stream.abort', input),
    onData: (channel: string, listener: (data: UIMessageChunk) => void) => {
      const subscription = (_event: unknown, data: UIMessageChunk) => listener(data);
      ipcRenderer.on(`${channel}-data`, subscription);
    },
    onEnd: (channel: string, listener: () => void) => {
      ipcRenderer.on(`${channel}-end`, listener);
    },
    onError: (channel: string, listener: (error: unknown) => void) => {
      const subscription = (_event: unknown, error: unknown) => listener(error);
      ipcRenderer.on(`${channel}-error`, subscription);
    },
    removeListeners: (channel: string) => {
      ipcRenderer.removeAllListeners(`${channel}-error`);
      ipcRenderer.removeAllListeners(`${channel}-end`);
      ipcRenderer.removeAllListeners(`${channel}-data`);
    }
};
