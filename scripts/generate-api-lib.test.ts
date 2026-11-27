import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { IpcController, IpcOn } from '../packages/backend-common/ipc/Decorators';
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
            'apps/cosmo-desktop/preload/api/streaming.ts',
            'apps/cosmo-desktop/preload/rpc-api.ts',
            'packages/contracts/api.ts',
            'packages/contracts/contracts/streaming.ts',
            'packages/contracts/http-api/streaming.ts',
        ]);
        expect(files['packages/contracts/api.ts']).toContain(
            "import { streamingHttpApi } from './http-api/streaming';",
        );
        expect(files['packages/contracts/api.ts']).toContain(
            "import type { StreamingApi } from './contracts/streaming';",
        );
        expect(files['packages/contracts/api.ts']).toContain('export interface CosmoApi {');
        expect(files['packages/contracts/api.ts']).toContain('streaming: streamingHttpApi,');
        expect(files['apps/cosmo-desktop/preload/api/streaming.ts']).toContain(
            "import type {ChatSendMessageArgs} from 'core/dto';",
        );
        expect(files['packages/contracts/contracts/streaming.ts']).toContain('export interface StreamingApi {');
        expect(files['packages/contracts/contracts/streaming.ts']).toContain(
            'onData: (channel: string, listener: (data: UIMessageChunk) => void) => void;',
        );
        expect(files['packages/contracts/http-api/streaming.ts']).toContain(
            "throw new Error('Streaming is handled by createChatTransport() in HTTP builds.');",
        );
        expect(files['apps/cosmo-desktop/preload/rpc-api.ts']).toContain(
            "import { streamingApi } from './api/streaming';",
        );
        expect(files['apps/cosmo-desktop/preload/rpc-api.ts']).toContain('export const rpcApi: CosmoApi = {');
        expect(files['apps/cosmo-desktop/preload/api/streaming.ts']).toContain(
            'const subscription = (_event: unknown, data: UIMessageChunk) => listener(data);',
        );
    });
});
