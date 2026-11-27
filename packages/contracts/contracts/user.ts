import type { ExperimentalFlags, UserProfile, UserProfileSaveInput } from 'core/dto';

export interface UserApi {
    getProfile(): Promise<UserProfile>;
    saveProfile(input: UserProfileSaveInput): Promise<UserProfile>;
    evaluateExperimentalFlags(): Promise<ExperimentalFlags>;
    saveExperimentalFlag(key: 'tasks' | 'workflow', enabled: boolean): Promise<void>;
}
