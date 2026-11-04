import type { AppDataSource } from '@/lib/store/app-data-source';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatSessionRegistry } from '../chat-session-registry';

const streams = vi.hoisted(() => new Map<string, ReadableStreamDefaultController>());
vi.mock('@/chat-transport', () => ({
    createChatTransport: () => ({
        sendMessages: ({ chatId, abortSignal }: { chatId: string; abortSignal?: AbortSignal }) =>
            Promise.resolve(
                new ReadableStream({
                    start(controller) {
                        streams.set(chatId, controller);
                        abortSignal?.addEventListener(
                            'abort',
                            () => controller.error(new DOMException('Stopped', 'AbortError')),
                            { once: true },
                        );
                    },
                }),
            ),
        reconnectToStream: () => Promise.resolve(null),
    }),
}));

function setup() {
    const backend = {
        message: { getByChat: vi.fn().mockResolvedValue([]) },
        chat: { updateChat: vi.fn().mockResolvedValue(undefined) },
    } as unknown as AppDataSource;
    return { backend, registry: new ChatSessionRegistry(backend, vi.fn()) };
}

beforeEach(() => streams.clear());

describe('ChatSessionRegistry', () => {
    it('keeps independent sessions and active streams across acquisitions', async () => {
        const { registry, backend } = setup();
        const one = await registry.acquire('one');
        const two = await registry.acquire('two');
        expect(await registry.acquire('one')).toBe(one);
        expect(backend.message.getByChat).toHaveBeenCalledTimes(2);
        const first = one.sendMessage({ text: 'first' });
        const second = two.sendMessage({ text: 'second' });
        await vi.waitFor(() => expect(streams.size).toBe(2));
        expect(registry.isRunning('one')).toBe(true);
        expect(registry.isRunning('two')).toBe(true);
        streams.get('one')!.enqueue({ type: 'start', messageId: 'answer' });
        streams.get('one')!.enqueue({ type: 'text-start', id: 'part' });
        streams.get('one')!.enqueue({ type: 'text-delta', id: 'part', delta: 'still running' });
        await vi.waitFor(() =>
            expect(
                one.messages.some((message) =>
                    message.parts.some((part) => part.type === 'text' && part.text === 'still running'),
                ),
            ).toBe(true),
        );
        expect((await registry.acquire('one')).messages).toEqual(one.messages);
        streams.get('one')!.close();
        await first;
        expect(registry.isRunning('one')).toBe(false);
        expect(registry.isRunning('two')).toBe(true);
        streams.get('two')!.close();
        await second;
    });

    it('does not create a session after its provider is disposed during hydration', async () => {
        const { registry, backend } = setup();
        let resolve!: (value: never[]) => void;
        vi.mocked(backend.message.getByChat).mockReturnValueOnce(
            new Promise((done) => {
                resolve = done;
            }),
        );
        const pending = registry.acquire('one');
        registry.dispose();
        resolve([]);
        await expect(pending).rejects.toThrow('registry is closed');
        await expect(registry.acquire('one')).rejects.toThrow('registry is closed');
    });

    it('stops only the session being deleted', async () => {
        const { registry } = setup();
        const one = await registry.acquire('one');
        const two = await registry.acquire('two');
        const first = one.sendMessage({ text: 'first' });
        const second = two.sendMessage({ text: 'second' });
        await vi.waitFor(() => expect(streams.size).toBe(2));
        await registry.beginDeletion('one');
        await first;
        expect(registry.isRunning('one')).toBe(false);
        expect(registry.isRunning('two')).toBe(true);
        registry.endDeletion('one', true);
        streams.get('two')!.close();
        await second;
    });

    it('retains a stopped session after failed deletion and forgets it after success', async () => {
        const { registry } = setup();
        const original = await registry.acquire('one');
        await registry.beginDeletion('one');
        expect(registry.isDeleting('one')).toBe(true);
        registry.endDeletion('one', false);
        expect(registry.isDeleting('one')).toBe(false);
        expect(await registry.acquire('one')).toBe(original);
        await registry.beginDeletion('one');
        registry.endDeletion('one', true);
        expect(await registry.acquire('one')).not.toBe(original);
    });

    it('does not resurrect a session whose history arrives after deletion', async () => {
        const { registry, backend } = setup();
        let resolve!: (messages: never[]) => void;
        vi.mocked(backend.message.getByChat).mockReturnValueOnce(
            new Promise((done) => {
                resolve = done;
            }),
        );
        const pending = registry.acquire('one');
        await registry.beginDeletion('one');
        registry.endDeletion('one', true);
        resolve([]);
        await expect(pending).rejects.toThrow('no longer available');
    });

    it('retries failed history hydration', async () => {
        const { registry, backend } = setup();
        vi.mocked(backend.message.getByChat).mockRejectedValueOnce(new Error('offline'));
        await expect(registry.acquire('one')).rejects.toThrow('offline');
        await expect(registry.acquire('one')).resolves.toBeDefined();
    });
});
