import type { UserProfile, UserProfileSaveInput } from 'core/dto';
import { UserProfileService } from 'core/services/UserProfileService';
import { CORETYPES } from 'core/types/types';
import { inject, injectable } from 'inversify';
import { z } from 'zod';
import { IpcController, IpcHandler } from '../ipc/Decorators';
import { Controller } from './Controller';

const userProfileSaveSchema = z.object({
    name: z.string().min(1),
    photo: z.string().nullable().optional(),
});

@injectable()
@IpcController('user')
export class UserController implements Controller {
    constructor(
        @inject(CORETYPES.UserProfileService)
        private readonly userProfileService: UserProfileService,
    ) {}

    /**
     * Resolves current user profile information from database or system defaults.
     */
    @IpcHandler('getProfile', z.tuple([]))
    public async getProfile(): Promise<UserProfile> {
        return this.userProfileService.getProfile();
    }

    /**
     * Saves user profile name into the database.
     */
    @IpcHandler('saveProfile', z.tuple([userProfileSaveSchema]))
    public async saveProfile(input: UserProfileSaveInput): Promise<UserProfile> {
        return this.userProfileService.saveProfile(input);
    }
}
