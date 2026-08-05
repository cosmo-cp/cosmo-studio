import { acpAgentsReducer } from '@/lib/store/acp-agents-store';
import { chatReducer } from '@/lib/store/chat-store';
import { commandsReducer } from '@/lib/store/commands-store';
import { mcpServersReducer } from '@/lib/store/mcp-servers-store';
import { personasReducer } from '@/lib/store/personas-store';
import { providersReducer } from '@/lib/store/providers-store';
import { webSearchReducer } from '@/lib/store/web-search-store';
import { configureStore, isPlain } from '@reduxjs/toolkit';
import { httpApi, type CosmoApi } from '../../../../preload/api';

const isSerializableValue = (value: unknown) => value instanceof Date || isPlain(value);

export function resolveAppDataSource(): CosmoApi {
    if (typeof window === 'undefined') {
        return httpApi;
    }

    const isHTTP = process.env.NEXT_PUBLIC_COSMO_BACKEND === 'http';
    if (isHTTP) {
        return httpApi;
    }
    return window.api;
}

export interface AppThunkExtra {
    appDataSource: CosmoApi;
}

// Build a fresh app store once at the renderer root.
export function makeStore(appDataSource: CosmoApi = resolveAppDataSource()) {
    return configureStore({
        reducer: {
            chat: chatReducer,
            acpAgents: acpAgentsReducer,
            commands: commandsReducer,
            personas: personasReducer,
            providers: providersReducer,
            webSearch: webSearchReducer,
            mcpServers: mcpServersReducer,
        },
        middleware: (getDefaultMiddleware) =>
            getDefaultMiddleware({
                thunk: {
                    extraArgument: {
                        appDataSource,
                    } satisfies AppThunkExtra,
                },
                serializableCheck: {
                    isSerializable: isSerializableValue,
                },
            }),
    });
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
