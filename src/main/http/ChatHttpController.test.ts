import { EventEmitter } from 'node:events';
import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatRunRegistry } from '../services/ChatRunRegistry';
import { ChatHttpController } from './ChatHttpController';

const mocks = vi.hoisted(() => {
    return { get: vi.fn(), pipe: vi.fn() };
});
vi.mock('./http-container', () => {
    return { httpContainer: { get: mocks.get } };
});
vi.mock('ai', () => {
    return { pipeUIMessageStreamToResponse: mocks.pipe };
});

function response() {
    const res = new EventEmitter() as EventEmitter & {
        status: ReturnType<typeof vi.fn>;
        json: ReturnType<typeof vi.fn>;
        writableFinished: boolean;
    };
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn();
    res.writableFinished = false;
    return res;
}

beforeEach(() => {
    return vi.resetAllMocks();
});

describe('ChatHttpController run ownership', () => {
    it('rejects overlaps and holds the reservation until the response finishes', async () => {
        let finish!: () => void;
        const pending = new Promise<void>((resolve) => {
            finish = resolve;
        });
        const service = {
            runs: new ChatRunRegistry(),
            createMessageStream: vi.fn().mockResolvedValue(new ReadableStream()),
        };
        mocks.get.mockReturnValueOnce(service).mockReturnValueOnce({ getChatById: vi.fn().mockResolvedValue(null) });
        mocks.pipe.mockReturnValue(pending);
        const controller = new ChatHttpController();
        const body = { id: 'one', messages: [], metadata: { modelId: 'provider:model' } };
        const firstResponse = response();
        const first = controller.sendMessage(body, {} as Request, firstResponse as unknown as Response);
        await vi.waitFor(() => {
            return expect(mocks.pipe).toHaveBeenCalledTimes(1);
        });
        const secondResponse = response();
        await controller.sendMessage(body, {} as Request, secondResponse as unknown as Response);
        expect(secondResponse.status).toHaveBeenCalledWith(409);
        firstResponse.emit('close');
        expect(service.createMessageStream.mock.calls[0][1].aborted).toBe(true);
        expect(service.runs.start('one')).toBeNull();
        finish();
        await first;
        expect(service.runs.start('one')).not.toBeNull();
    });
});
