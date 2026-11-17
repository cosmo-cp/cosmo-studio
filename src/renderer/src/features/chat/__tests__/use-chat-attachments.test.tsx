import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { serializeChatAttachments, useChatAttachments } from '../use-chat-attachments';

afterEach(() => vi.restoreAllMocks());

describe('chat attachments', () => {
    it('adds dropped and selected files and releases object URLs', () => {
        const create = vi
            .spyOn(URL, 'createObjectURL')
            .mockReturnValueOnce('blob:first')
            .mockReturnValueOnce('blob:second');
        const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
        const { result, unmount } = renderHook(() => useChatAttachments());
        const first = new File(['a'], 'a.txt', { type: 'text/plain' });
        const second = new File(['b'], 'b.txt', { type: 'text/plain' });
        act(() => result.current.add([first]));
        act(() => {
            const event = new Event('drop', { cancelable: true });
            Object.defineProperty(event, 'dataTransfer', { value: { files: [second] } });
            document.dispatchEvent(event);
            expect(event.defaultPrevented).toBe(true);
        });
        expect(create).toHaveBeenCalledTimes(2);
        expect(result.current.files.map((file) => file.filename)).toEqual(['a.txt', 'b.txt']);
        act(() => result.current.remove(result.current.files[0].id));
        expect(revoke).toHaveBeenCalledWith('blob:first');
        unmount();
        expect(revoke).toHaveBeenCalledWith('blob:second');
    });

    it('serializes temporary URLs into data URLs', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({ blob: async () => new Blob(['hello'], { type: 'text/plain' }) }),
        );
        const files = await serializeChatAttachments([
            { id: '1', type: 'file', filename: 'a.txt', mediaType: 'text/plain', url: 'blob:first' },
        ]);
        expect(files).toEqual([
            { type: 'file', filename: 'a.txt', mediaType: 'text/plain', url: 'data:text/plain;base64,aGVsbG8=' },
        ]);
        vi.unstubAllGlobals();
    });
});
