'use client';

import { resolveAppDataSource } from '@/lib/store/app-data-source';
import type { AppDataSource } from '@/lib/store/app-data-source';
import { createAppStore, type AppStore } from '@/lib/store/store';
import { createContext, useState, type JSX, type ReactNode } from 'react';
import { SWRConfig } from 'swr';

export const StoreContext = createContext<AppStore | null>(null);

// Keep one app store instance per renderer tree so tests can inject a custom backend.
export function StoreProvider({
    children,
    appDataSource,
}: {
    children: ReactNode;
    appDataSource?: AppDataSource;
}): JSX.Element {
    const resolvedAppDataSource = appDataSource ??  resolveAppDataSource();
    const [store] = useState(() => createAppStore(resolvedAppDataSource));

    return (
        <StoreContext.Provider value={store}>
            <SWRConfig
                value={{
                    provider: () => new Map(),
                    revalidateOnFocus: false,
                }}
            >
                {children}
            </SWRConfig>
        </StoreContext.Provider>
    );
}
