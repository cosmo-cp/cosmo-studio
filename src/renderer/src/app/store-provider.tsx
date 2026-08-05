'use client';

import { makeStore } from '@/lib/store/store';
import { useState, type JSX, type ReactNode } from 'react';
import { Provider } from 'react-redux';
import type { CosmoApi } from '../../../preload/api';

// Keep the Redux store stable for the lifetime of the renderer app.
export function StoreProvider({
    children,
    appDataSource,
}: {
    children: ReactNode;
    appDataSource?: CosmoApi;
}): JSX.Element {
    const [store] = useState(() => makeStore(appDataSource));

    return <Provider store={store}>{children}</Provider>;
}
