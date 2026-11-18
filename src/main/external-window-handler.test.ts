import type { WebContents } from 'electron';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerExternalWindowHandler } from './external-window-handler';

const { openExternal, warn } = vi.hoisted(() => {
    return { openExternal: vi.fn(), warn: vi.fn() };
});
vi.mock('electron', () => {
    return { shell: { openExternal: openExternal } };
});
vi.mock('./logger', () => {
    return { logger: { warn: warn } };
});

describe('external window handler', () => {
    let handler: (details: { url: string }) => { action: string };

    beforeEach(() => {
        vi.clearAllMocks();
        openExternal.mockResolvedValue(undefined);
        registerExternalWindowHandler({
            setWindowOpenHandler: (callback: typeof handler) => {
                handler = callback;
            },
        } as unknown as WebContents);
    });

    it('opens web links in the default browser without creating an app window', () => {
        expect(handler({ url: 'https://cosmocp.com/docs/home' })).toEqual({ action: 'deny' });
        expect(openExternal).toHaveBeenCalledWith('https://cosmocp.com/docs/home');
    });

    it('blocks non-web and invalid URLs', () => {
        expect(handler({ url: 'file:///etc/passwd' })).toEqual({ action: 'deny' });
        expect(handler({ url: 'not a url' })).toEqual({ action: 'deny' });
        expect(openExternal).not.toHaveBeenCalled();
        expect(warn).toHaveBeenCalled();
    });

    it('handles browser launch failures', async () => {
        openExternal.mockRejectedValue(new Error('failed'));
        handler({ url: 'http://example.com/' });
        await vi.waitFor(() => {
            return expect(warn).toHaveBeenCalled();
        });
    });
});
