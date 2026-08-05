import type { UIMessageChunk } from 'ai';
import type {
    ChatAbortArgs,
    ChatSendMessageArgs,
    WorkflowRunStreamAbortArgs,
    WorkflowRunStreamStartArgs,
} from '../../../packages/core/dto';

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
