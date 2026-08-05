import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { IpcController, IpcOn } from '../src/main/ipc/Decorators';
import { generatePreloadApiFiles } from './generate-api-lib';

@IpcController('streamingChat')
class TestStreamingController {
    // Ensures generated preload streaming listeners preserve the chunk type.
    @IpcOn('sendMessage')
    public sendMessage(args: { chatId: string }): void {
        void args;
    }
}

describe('generatePreloadApiFiles', () => {
    it('splits the preload API into files and keeps streaming chunk typing', () => {
        const files = generatePreloadApiFiles([
            {
                controller: TestStreamingController,
                source: `
          export class TestStreamingController {
            @IpcOn("sendMessage")
            public sendMessage(args: ChatSendMessageArgs): void {}
          }
        `,
            },
        ]);

        expect(Object.keys(files).sort()).toEqual([
            'src/preload/api.ts',
            'src/preload/api/streaming.ts',
            'src/preload/contracts/streaming.ts',
            'src/preload/http-api/streaming.ts',
            'src/preload/rpc-api.ts',
        ]);
        expect(files['src/preload/api.ts']).toContain(
            "import { streamingHttpApi } from './http-api/streaming';",
        );
        expect(files['src/preload/api.ts']).toContain(
            "import type { StreamingApi } from './contracts/streaming';",
        );
        expect(files['src/preload/api.ts']).toContain('export interface CosmoApi {');
        expect(files['src/preload/api.ts']).toContain('streaming: streamingHttpApi,');
        expect(files['src/preload/api/streaming.ts']).toContain(
            "import type {ChatSendMessageArgs} from '../../../packages/core/dto';",
        );
        expect(files['src/preload/contracts/streaming.ts']).toContain('export interface StreamingApi {');
        expect(files['src/preload/contracts/streaming.ts']).toContain(
            'onData: (channel: string, listener: (data: UIMessageChunk) => void) => void;',
        );
        expect(files['src/preload/http-api/streaming.ts']).toContain(
            "throw new Error('Streaming is handled by createChatTransport() in HTTP builds.');",
        );
        expect(files['src/preload/rpc-api.ts']).toContain(
            "import { streamingApi } from './api/streaming';",
        );
        expect(files['src/preload/rpc-api.ts']).toContain('export const rpcApi: CosmoApi = {');
        expect(files['src/preload/api/streaming.ts']).toContain(
            'const subscription = (_event: unknown, data: UIMessageChunk) => listener(data);',
        );
    });
});
