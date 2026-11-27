import type { CosmoApi } from 'contracts/api';

declare global {
    interface Window {
        api: CosmoApi;
    }
}
