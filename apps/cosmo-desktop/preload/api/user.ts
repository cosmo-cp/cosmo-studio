import type { UserApi } from 'contracts/contracts/user';
import type { UserProfileSaveInput } from 'core/dto';
import { ipcRenderer } from 'electron';

export const userApi: UserApi = {
    getProfile: () => {
        return ipcRenderer.invoke('user:getProfile');
    },
    saveProfile: (input: UserProfileSaveInput) => {
        return ipcRenderer.invoke('user:saveProfile', input);
    },
    evaluateExperimentalFlags: () => {
        return ipcRenderer.invoke('user:evaluateExperimentalFlags');
    },
    saveExperimentalFlag: (key: 'tasks' | 'workflow', enabled: boolean) => {
        return ipcRenderer.invoke('user:saveExperimentalFlag', key, enabled);
    },
};
