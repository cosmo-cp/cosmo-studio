import { useSyncExternalStore } from 'react';

const MOBILE_QUERY = '(max-width: 767px)';

// Keep the sidebar in sync with viewport changes without relying on hydration state.
function subscribe(onChange: () => void) {
    if (typeof window.matchMedia !== 'function') return () => {};
    const media = window.matchMedia(MOBILE_QUERY);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
}

// Read the browser viewport when matchMedia is available.
function getSnapshot() {
    return typeof window.matchMedia === 'function' && window.matchMedia(MOBILE_QUERY).matches;
}

// Keep server rendering independent of browser APIs.
function getServerSnapshot() {
    return false;
}

export function useIsMobile() {
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
