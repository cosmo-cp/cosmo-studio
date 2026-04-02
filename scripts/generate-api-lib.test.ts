import 'reflect-metadata';
import {describe, expect, it} from 'vitest';
import {IpcController, IpcOn} from '../src/main/ipc/Decorators';
import {generateApiContent} from './generate-api-lib';

@IpcController('streamingChat')
class TestStreamingController {
  // Ensures generated preload streaming listeners preserve the chunk type.
  @IpcOn('sendMessage')
  public sendMessage(args: {chatId: string}): void {
    void args;
  }
}

describe('generateApiContent', () => {
  it('types streaming data listeners as UIMessageChunk', () => {
    const apiContent = generateApiContent([
      {
        controller: TestStreamingController,
        source: `
          export class TestStreamingController {
            @IpcOn("sendMessage")
            public sendMessage(args: {chatId: string}): void {}
          }
        `,
      },
    ]);

    expect(apiContent).toContain(
      'onData: (channel: string, listener: (data: UIMessageChunk) => void) => void;'
    );
    expect(apiContent).toContain(
      'const subscription = (_event: unknown, data: UIMessageChunk) => listener(data);'
    );
  });
});
