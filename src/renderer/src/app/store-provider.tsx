'use client';

import { type JSX, type ReactNode, useState } from 'react';
import { Provider } from 'react-redux';
import { makeStore } from '@/lib/store/store';


// Keep the Redux store stable for the lifetime of the renderer app.
export function StoreProvider({ children }: { children: ReactNode }): JSX.Element {
    const [store] = useState(() => makeStore());

    return <Provider store={store}>{children}</Provider>;
}
