import type { AppStoreState } from '@/lib/store/store';
import type { FrontendWebSearchProviderConfig } from '@/lib/web-search-options';
import type { StateCreator } from 'zustand';

interface SaveParallelWebSearchConfigPayload {
    enabled: boolean;
    apiKey?: string | null;
}

export interface WebSearchState {
    parallelConfig: FrontendWebSearchProviderConfig | null;
}

export interface WebSearchSlice extends WebSearchState {
    saveParallelWebSearchConfig: (payload: SaveParallelWebSearchConfigPayload) => void;
    deleteParallelWebSearchConfig: () => void;
}

export const createInitialWebSearchState = (): WebSearchState => ({
    parallelConfig: null,
});

// Keep renderer-only Parallel settings local to the browser process.
export const createWebSearchSlice: StateCreator<AppStoreState, [], [], WebSearchSlice> = (set) => ({
    ...createInitialWebSearchState(),
    saveParallelWebSearchConfig: ({ enabled, apiKey }) => {
        set((state) => ({
            parallelConfig: {
                enabled,
                hasApiKey: Boolean(apiKey?.trim()) || state.parallelConfig?.hasApiKey || false,
            },
        }));
    },
    deleteParallelWebSearchConfig: () => {
        set({ parallelConfig: null });
    },
});
