import { CosmoApi } from '../../preload/api';

declare global {
    interface Window {
        api: CosmoApi;
    }
}
