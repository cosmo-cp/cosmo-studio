import { httpApi, type CosmoApi } from '../../../../preload/api';

export type AppDataSource = CosmoApi;

// Resolve the active backend once so feature hooks do not branch per call site.
export function resolveAppDataSource(): AppDataSource {
    if (typeof window === 'undefined') {
        return httpApi;
    }

    if (process.env.NEXT_PUBLIC_COSMO_BACKEND === 'http') {
        return httpApi;
    }

    return window.api;
}
