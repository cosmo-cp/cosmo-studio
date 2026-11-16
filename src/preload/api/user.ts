import { ipcRenderer } from 'electron';
import type { UserProfileSaveInput } from '../../../packages/core/dto';
import type { UserApi } from '../contracts/user';

export const userApi: UserApi = {
    getProfile: () => {
        return ipcRenderer.invoke('user:getProfile');
    },
    saveProfile: (input: UserProfileSaveInput) => {
        return ipcRenderer.invoke('user:saveProfile', input);
    },
};
