'use client';

import { makeStore, resolveAppDataSource } from '@/lib/store/store';
import { createContext, useContext, useState, type JSX, type ReactNode } from 'react';
import { Provider } from 'react-redux';
import type { CosmoApi } from '../../../preload/api';

const AppDataSourceContext = createContext<CosmoApi | null>(null);

// Exposes the resolved adapter so client components can honor injected app data sources in tests.
export function useAppDataSource(): CosmoApi {
    const appDataSource = useContext(AppDataSourceContext);
    return appDataSource ?? resolveAppDataSource();
}

// Keep the Redux store stable for the lifetime of the renderer app.
export function StoreProvider({
    children,
    appDataSource,
}: {
    children: ReactNode;
    appDataSource?: CosmoApi;
}): JSX.Element {
    const resolvedAppDataSource = appDataSource ?? resolveAppDataSource();
    const [store] = useState(() => makeStore(resolvedAppDataSource));

    return (
        <AppDataSourceContext.Provider value={resolvedAppDataSource}>
            <Provider store={store}>{children}</Provider>
        </AppDataSourceContext.Provider>
    );
}
