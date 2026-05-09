'use client'

import {type JSX, type PropsWithChildren, useState} from "react";
import {Provider} from "react-redux";
import type {AppDataSource} from "@/lib/app-data-source";
import {makeStore} from "@/lib/store/store";

interface StoreProviderProps extends PropsWithChildren {
    appDataSource?: AppDataSource;
}

// Keep the Redux store stable for the lifetime of the renderer app.
export function StoreProvider({
    children,
    appDataSource,
}: StoreProviderProps): JSX.Element {
    const [store] = useState(() => makeStore({appDataSource}));

    return <Provider store={store}>{children}</Provider>;
}
