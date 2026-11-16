import { describe, expect, it, vi } from 'vitest';
import type { UserProfileRepository } from '../repositories/UserProfileRepository';
import { UserProfileService } from './UserProfileService';

describe('UserProfileService', () => {
    it('returns isConfigured: false with detected name if no db record exists', async () => {
        const repo = {
            get: vi.fn().mockResolvedValue(undefined),
            save: vi.fn(),
        } as unknown as UserProfileRepository;

        const service = new UserProfileService(repo);
        const profile = await service.getProfile();

        expect(profile.isConfigured).toBe(false);
        expect(profile.name.length).toBeGreaterThan(0);
        expect(profile.initials.length).toBeGreaterThanOrEqual(1);
    });

    it('returns isConfigured: true and db name when record exists', async () => {
        const repo = {
            get: vi.fn().mockResolvedValue({ id: '1', name: 'Alice Wonderland', photo: 'data:image/png;base64,123' }),
            save: vi.fn(),
        } as unknown as UserProfileRepository;

        const service = new UserProfileService(repo);
        const profile = await service.getProfile();

        expect(profile.isConfigured).toBe(true);
        expect(profile.name).toBe('Alice Wonderland');
        expect(profile.initials).toBe('AW');
        expect(profile.photo).toBe('data:image/png;base64,123');
    });

    it('saves a profile with photo and returns isConfigured: true', async () => {
        const repo = {
            get: vi.fn(),
            save: vi.fn().mockResolvedValue({ id: '1', name: 'Bob Builder', photo: 'data:image/png;base64,456' }),
        } as unknown as UserProfileRepository;

        const service = new UserProfileService(repo);
        const profile = await service.saveProfile({ name: 'Bob Builder', photo: 'data:image/png;base64,456' });

        expect(repo.save).toHaveBeenCalledWith('Bob Builder', 'data:image/png;base64,456');
        expect(profile.name).toBe('Bob Builder');
        expect(profile.initials).toBe('BB');
        expect(profile.photo).toBe('data:image/png;base64,456');
        expect(profile.isConfigured).toBe(true);
    });

    it('throws error when saving empty name', async () => {
        const repo = {
            get: vi.fn(),
            save: vi.fn(),
        } as unknown as UserProfileRepository;

        const service = new UserProfileService(repo);
        await expect(service.saveProfile({ name: '   ' })).rejects.toThrow('Name is required.');
    });
});
