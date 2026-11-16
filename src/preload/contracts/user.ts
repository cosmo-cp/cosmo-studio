import type { UserProfile, UserProfileSaveInput } from '../../../packages/core/dto';

export interface UserApi {
    getProfile(): Promise<UserProfile>;
    saveProfile(input: UserProfileSaveInput): Promise<UserProfile>;
}
