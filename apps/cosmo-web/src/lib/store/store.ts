import { createChatSlice, type ChatSlice } from '@/features/chat/chat-store';
import { createWebSearchSlice, type WebSearchSlice } from '@/features/web-search/web-search-store';
import { resolveAppDataSource, type AppDataSource } from '@/lib/store/app-data-source';
import { createUiFeedbackSlice, type UiFeedbackSlice } from '@/lib/store/ui-feedback-store';
import { createStore } from 'zustand/vanilla';

export interface AppStoreState extends ChatSlice, UiFeedbackSlice, WebSearchSlice {
    appDataSource: AppDataSource;
}

export type AppStore = ReturnType<typeof createAppStore>;

// Create one bounded renderer store so every page reads from the same state surface.
export function createAppStore(appDataSource: AppDataSource = resolveAppDataSource()) {
    return createStore<AppStoreState>()((...storeArgs) => ({
        appDataSource,
        ...createChatSlice(...storeArgs),
        ...createUiFeedbackSlice(...storeArgs),
        ...createWebSearchSlice(...storeArgs),
    }));
}
