import * as cp from 'child_process';
import * as os from 'os';
import { inject, injectable } from 'inversify';
import type { UserProfile, UserProfileSaveInput } from '../dto';
import { UserProfileRepository } from '../repositories/UserProfileRepository';
import { CORETYPES } from '../types/types';

@injectable()
export class UserProfileService {
    constructor(
        @inject(CORETYPES.UserProfileRepository)
        private readonly userProfileRepository: UserProfileRepository,
    ) {}

    /** Retrieves persisted choices for the flags adapter. */
    public async getExperimentalFlags(): Promise<Record<string, boolean>> {
        return this.userProfileRepository.getExperimentalFlags();
    }

    /** Persists a single experimental feature choice. */
    public async saveExperimentalFlag(key: string, enabled: boolean): Promise<void> {
        await this.userProfileRepository.saveExperimentalFlag(key, enabled);
    }

    /**
     * Resolves the current user profile from the database, or suggests detected OS name if unconfigured.
     */
    public async getProfile(): Promise<UserProfile> {
        const record = await this.userProfileRepository.get();
        if (record && record.name && record.name.trim().length > 0) {
            const name = record.name.trim();
            return {
                name: name,
                initials: this.calculateInitials(name),
                photo: record.photo ?? null,
                isConfigured: true,
            };
        }

        const suggestedName = this.detectOsName();
        return {
            name: suggestedName,
            initials: this.calculateInitials(suggestedName),
            photo: null,
            isConfigured: false,
        };
    }

    /**
     * Saves user profile name and photo into the database.
     */
    public async saveProfile(input: UserProfileSaveInput): Promise<UserProfile> {
        const trimmed = input.name ? input.name.trim() : '';
        if (!trimmed) {
            throw new Error('Name is required.');
        }

        const record = await this.userProfileRepository.save(trimmed, input.photo);
        return {
            name: record.name,
            initials: this.calculateInitials(record.name),
            photo: record.photo ?? null,
            isConfigured: true,
        };
    }

    private calculateInitials(name: string): string {
        const trimmed = name.trim();
        if (!trimmed) {
            return 'GU';
        }
        const parts = trimmed.split(/\s+/);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return trimmed.slice(0, 2).toUpperCase();
    }

    private detectOsName(): string {
        let fullName = '';
        let username = '';

        try {
            const info = os.userInfo();
            username = info.username || '';
        } catch {
            username = process.env.USER || process.env.USERNAME || '';
        }

        if (process.platform === 'darwin') {
            try {
                fullName = cp.execSync('id -F', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
            } catch {
                // Ignore fallback
            }
        }

        if (fullName) {
            return fullName.split(/\s+/)[0];
        } else if (username) {
            return username.charAt(0).toUpperCase() + username.slice(1);
        }

        return 'Guest';
    }
}
