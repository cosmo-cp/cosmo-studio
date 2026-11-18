import type { ExperimentalFlags, UserProfile, UserProfileSaveInput } from '../../../packages/core/dto';
import { callRpc } from '../api/common';
import type { UserApi } from '../contracts/user';

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
