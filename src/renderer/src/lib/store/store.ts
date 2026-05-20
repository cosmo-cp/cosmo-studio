import {configureStore, isPlain} from "@reduxjs/toolkit";
import {resolveAppDataSource, type AppDataSource} from "@/lib/app-data-source";
import {acpAgentsReducer} from "@/lib/store/acp-agents-store";
import {commandsReducer} from "@/lib/store/commands-store";
import {chatReducer} from "@/lib/store/chat-store";
import {mcpServersReducer} from "@/lib/store/mcp-servers-store";
import {personasReducer} from "@/lib/store/personas-store";
import {providersReducer} from "@/lib/store/providers-store";
import {webSearchReducer} from "@/lib/store/web-search-store";

export interface AppThunkExtra {
    appDataSource: AppDataSource;
}

interface MakeStoreOptions {
    appDataSource?: AppDataSource;
}

const isSerializableValue = (value: unknown) =>
    value instanceof Date || isPlain(value);

// Build a fresh app store once at the renderer root.
export function makeStore(options: MakeStoreOptions = {}) {
    const appDataSource = options.appDataSource ?? resolveAppDataSource();

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
                    },
                },
                serializableCheck: {
                    isSerializable: isSerializableValue,
                },
            }),
    });
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
