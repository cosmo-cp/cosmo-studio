import { Api } from '../../preload/api';

declare global {
    interface Window {
        api: Api;
    }
}
