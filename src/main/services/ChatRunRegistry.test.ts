import { describe, expect, it, vi } from 'vitest';
import { ChatRunRegistry } from './ChatRunRegistry';

describe('ChatRunRegistry', () => {
    it('reserves one run per chat while allowing other chats to run', () => {
        const registry = new ChatRunRegistry();
        const first = registry.start('one')!;
        expect(registry.start('one')).toBeNull();
        expect(registry.start('two')).not.toBeNull();
        registry.finish('one', first);
        expect(registry.start('one')).not.toBeNull();
    });

    it('does not let stale cleanup release a newer run', () => {
        const registry = new ChatRunRegistry();
        const first = registry.start('one')!;
        registry.finish('one', first);
        const second = registry.start('one')!;
        registry.finish('one', first);
        expect(registry.start('one')).toBeNull();
        registry.finish('one', second);
        expect(registry.start('one')).not.toBeNull();
    });
    it('waits for the active run and excludes new runs until deletion completes', async () => {
        const registry = new ChatRunRegistry();
        const run = registry.start('one')!;
        let finishDelete!: () => void;
        const remove = vi.fn(() => {
            return new Promise<void>((resolve) => {
                finishDelete = resolve;
            });
        });
        const deletion = registry.deleteChat('one', remove);
        expect(run.signal.aborted).toBe(true);
        expect(registry.start('one')).toBeNull();
        expect(remove).not.toHaveBeenCalled();
        await expect(registry.deleteChat('one', remove)).rejects.toThrow('already in progress');
        registry.finish('one', run);
        await vi.waitFor(() => {
            return expect(remove).toHaveBeenCalledOnce();
        });
        expect(registry.start('one')).toBeNull();
        finishDelete();
        await deletion;
        expect(registry.start('one')).not.toBeNull();
    });

    it('preserves the chat when cancellation times out and keeps its run reserved', async () => {
        vi.useFakeTimers();
        try {
            const registry = new ChatRunRegistry();
            const run = registry.start('one')!;
            const remove = vi.fn();
            const deletion = registry.deleteChat('one', remove);
            const rejection = expect(deletion).rejects.toThrow('Timed out');
            await vi.advanceTimersByTimeAsync(30000);
            await rejection;
            expect(remove).not.toHaveBeenCalled();
            expect(registry.start('one')).toBeNull();
            registry.finish('one', run);
            expect(registry.start('one')).not.toBeNull();
        } finally {
            vi.useRealTimers();
        }
    });

    it('releases deletion exclusion when removal fails', async () => {
        const registry = new ChatRunRegistry();
        await expect(
            registry.deleteChat('one', async () => {
                throw new Error('failed');
            }),
        ).rejects.toThrow('failed');
        expect(registry.start('one')).not.toBeNull();
    });
});
