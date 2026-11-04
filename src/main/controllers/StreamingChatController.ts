import type { ChatAbortArgs, ChatSendMessageArgs } from 'core/dto';
import { IpcMainEvent, WebContents } from 'electron';
import { inject, injectable } from 'inversify';
import { z } from 'zod';
import { IpcController, IpcOn, IpcRendererOn } from '../ipc/Decorators';
import { logger } from '../logger';
import { ChatStreamingService } from '../services/ChatStreamingService';
import { TYPES } from '../types';
import { Controller } from './Controller';

const chatSendMessageArgsSchema = z.custom<ChatSendMessageArgs>();
const chatAbortArgsSchema = z.custom<ChatAbortArgs>();

@injectable()
@IpcController('streamingChat')
export class StreamingChatController implements Controller {
    private readonly activeStreams = new Map<string, AbortController>();
    private readonly streamOwners = new Map<string, WebContents>();

    constructor(
        @inject(TYPES.ChatStreamingService)
        private readonly chatStreamingService: ChatStreamingService,
    ) {}

    @IpcOn('sendMessage', z.tuple([chatSendMessageArgsSchema]))
    public async sendMessage(args: ChatSendMessageArgs, event: IpcMainEvent) {
        const webContents = event.sender as WebContents;
        if (this.activeStreams.has(args.streamChannel)) {
            logger.warn('Rejected duplicate stream channel');
            return;
        }
        const controller = this.chatStreamingService.runs.start(args.chatId);
        if (!controller) {
            if (!webContents.isDestroyed())
                webContents.send(`${args.streamChannel}-error`, {
                    message: 'A response is already running for this chat',
                });
            return;
        }
        this.activeStreams.set(args.streamChannel, controller);
        this.streamOwners.set(args.streamChannel, webContents);

        try {
            const stream = await this.chatStreamingService.createMessageStream(args, controller.signal);
            for await (const chunk of stream) {
                if (webContents.isDestroyed()) {
                    logger.info('WebContents destroyed, stopping stream.');
                    controller.abort();
                    break;
                }
                webContents.send(`${args.streamChannel}-data`, chunk);
            }
            if (!webContents.isDestroyed()) {
                webContents.send(`${args.streamChannel}-end`);
            }
        } catch (error) {
            logger.error('Failed to start streamText:', error);
            controller.abort();
            if (!webContents.isDestroyed()) {
                webContents.send(`${args.streamChannel}-error`, error);
            }
        } finally {
            if (this.activeStreams.get(args.streamChannel) === controller) {
                this.activeStreams.delete(args.streamChannel);
                this.streamOwners.delete(args.streamChannel);
            }
            this.chatStreamingService.runs.finish(args.chatId, controller);
        }
    }

    @IpcOn('abortMessage', z.tuple([chatAbortArgsSchema]))
    public abortMessage(args: ChatAbortArgs, event: IpcMainEvent) {
        const controller = this.activeStreams.get(args.streamChannel);
        if (controller && !controller.signal.aborted && this.streamOwners.get(args.streamChannel) === event.sender) {
            controller.abort();
            logger.info(`Aborted stream for channel: ${args.streamChannel}`);
        }
    }

    @IpcRendererOn('data')
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public onData(channel: string, listener: (data: unknown) => void): () => void {
        return () => {};
    }

    @IpcRendererOn('end')
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public onEnd(channel: string, listener: () => void): () => void {
        return () => {};
    }

    @IpcRendererOn('error')
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public onError(channel: string, listener: (error: unknown) => void): () => void {
        return () => {};
    }
}
