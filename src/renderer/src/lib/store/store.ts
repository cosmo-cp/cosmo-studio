import {configureStore, isPlain} from "@reduxjs/toolkit";
import {resolveAppDataSource, type AppDataSource} from "@/lib/app-data-source";
import {commandsReducer} from "@/lib/store/commands-store";
import {mainChatPageReducer} from "@/lib/store/main-chat-page-slice";
import {mcpServersReducer} from "@/lib/store/mcp-servers-store";
import {personasReducer} from "@/lib/store/personas-store";
import {providersReducer} from "@/lib/store/providers-store";

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
            mainChatPage: mainChatPageReducer,
            commands: commandsReducer,
            personas: personasReducer,
            providers: providersReducer,
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
