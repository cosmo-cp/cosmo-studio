import type { ExperimentalFlags, UserProfile, UserProfileSaveInput } from 'core/dto';
import { UserProfileService } from 'core/services/UserProfileService';
import { CORETYPES } from 'core/types/types';
import { inject, injectable } from 'inversify';
import { z } from 'zod';
import { evaluateExperimentalFlags } from '../flags/experimental';
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
    /** Evaluates persisted choices using the Flags SDK database adapter. */
    @IpcHandler('evaluateExperimentalFlags', z.tuple([]))
    public async evaluateExperimentalFlags(): Promise<ExperimentalFlags> {
        return evaluateExperimentalFlags(() => {
            return this.userProfileService.getExperimentalFlags();
        });
    }

    /** Saves a choice without changing other experimental features. */
    @IpcHandler('saveExperimentalFlag', z.tuple([z.enum(['tasks', 'workflow']), z.boolean()]))
    public async saveExperimentalFlag(key: 'tasks' | 'workflow', enabled: boolean): Promise<void> {
        await this.userProfileService.saveExperimentalFlag(key, enabled);
    }
}
