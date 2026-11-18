import type { UserProfileService } from 'core/services/UserProfileService';
import { describe, expect, it, vi } from 'vitest';
import { IPC_ARGS_SCHEMA_METADATA_KEY } from '../../ipc/Decorators';
import { UserController } from '../UserController';

describe('UserController', () => {
    it('returns a user profile from service', async () => {
        const service = {
            getProfile: vi.fn().mockResolvedValue({
                name: 'Gaurav',
                initials: 'GA',
                photo: 'data:image/png;base64,123',
                isConfigured: true,
            }),
            saveProfile: vi.fn(),
        } as unknown as UserProfileService;

        const controller = new UserController(service);
        const profile = await controller.getProfile();

        expect(service.getProfile).toHaveBeenCalled();
        expect(profile).toEqual({
            name: 'Gaurav',
            initials: 'GA',
            photo: 'data:image/png;base64,123',
            isConfigured: true,
        });
    });

    it('saves a user profile via service', async () => {
        const service = {
            getProfile: vi.fn(),
            saveProfile: vi.fn().mockResolvedValue({
                name: 'Gaurav Saini',
                initials: 'GS',
                photo: 'data:image/png;base64,456',
                isConfigured: true,
            }),
        } as unknown as UserProfileService;

        const controller = new UserController(service);
        const profile = await controller.saveProfile({
            name: 'Gaurav Saini',
            photo: 'data:image/png;base64,456',
        });

        expect(service.saveProfile).toHaveBeenCalledWith({
            name: 'Gaurav Saini',
            photo: 'data:image/png;base64,456',
        });
        expect(profile).toEqual({
            name: 'Gaurav Saini',
            initials: 'GS',
            photo: 'data:image/png;base64,456',
            isConfigured: true,
        });
    });
    it('validates and saves experimental choices', async () => {
        const schemas = Reflect.getMetadata(IPC_ARGS_SCHEMA_METADATA_KEY, UserController);
        expect(schemas.saveExperimentalFlag.safeParse(['tasks', false]).success).toBe(true);
        expect(schemas.saveExperimentalFlag.safeParse(['unknown', false]).success).toBe(false);
        expect(schemas.saveExperimentalFlag.safeParse(['tasks', 'false']).success).toBe(false);
        const service = {
            getExperimentalFlags: vi.fn().mockResolvedValue({ tasks: false }),
            saveExperimentalFlag: vi.fn(),
        } as unknown as UserProfileService;
        const controller = new UserController(service);
        await controller.saveExperimentalFlag('tasks', false);
        expect(service.saveExperimentalFlag).toHaveBeenCalledWith('tasks', false);
        await expect(controller.evaluateExperimentalFlags()).resolves.toEqual({ tasks: false, workflow: false });
    });
});
