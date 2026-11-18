import * as React from 'react';

const MOBILE_BREAKPOINT = 768;

// Subscribe to breakpoint changes so the sidebar follows the viewport.
function subscribe(onChange: () => void) {
    window.addEventListener('resize', onChange);
    return () => window.removeEventListener('resize', onChange);
}

// Keep server rendering deterministic while reading the actual viewport in the browser.
export function useIsMobile() {
    return React.useSyncExternalStore(
        subscribe,
        () => window.innerWidth < MOBILE_BREAKPOINT,
        () => false,
    );
}
