import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useIsMobile } from './use-mobile';

afterEach(() => {
    vi.unstubAllGlobals();
});

it('tracks viewport breakpoint changes and unsubscribes on unmount', () => {
    const removeEventListener = vi.spyOn(window, 'removeEventListener');
    vi.stubGlobal('innerWidth', 1024);
    const { result, unmount } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
    act(() => {
        vi.stubGlobal('innerWidth', 767);
        window.dispatchEvent(new Event('resize'));
    });
    expect(result.current).toBe(true);
    act(() => {
        vi.stubGlobal('innerWidth', 768);
        window.dispatchEvent(new Event('resize'));
    });
    expect(result.current).toBe(false);
    unmount();
    expect(removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
    removeEventListener.mockRestore();
});
