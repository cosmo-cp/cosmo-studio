import { StoreContext } from '@/app/store-provider';
import type { AppStore, AppStoreState } from '@/lib/store/store';
import { useContext } from 'react';
import { useStore } from 'zustand';

function useAppStoreApi(): AppStore {
    const store = useContext(StoreContext);

    if (!store) {
        throw new Error('StoreProvider is missing from the renderer tree.');
    }

    return store;
}

export function useAppStore<SelectedState>(selector: (state: AppStoreState) => SelectedState): SelectedState {
    return useStore(useAppStoreApi(), selector);
}

export function useAppDataSource() {
    return useAppStore((state) => state.appDataSource);
}
