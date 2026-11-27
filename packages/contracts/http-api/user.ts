import type { ExperimentalFlags, UserProfile, UserProfileSaveInput } from 'core/dto';
import type { UserApi } from '../contracts/user';
import { callRpc } from './common';

export const userHttpApi: UserApi = {
    getProfile: () => {
        return callRpc<UserProfile>('user', 'getProfile', []);
    },
    saveProfile: (input: UserProfileSaveInput) => {
        return callRpc<UserProfile>('user', 'saveProfile', [input]);
    },
    evaluateExperimentalFlags: () => {
        return callRpc<ExperimentalFlags>('user', 'evaluateExperimentalFlags', []);
    },
    saveExperimentalFlag: (key: 'tasks' | 'workflow', enabled: boolean) => {
        return callRpc<void>('user', 'saveExperimentalFlag', [key, enabled]);
    },
};
