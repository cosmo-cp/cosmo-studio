import { injectable } from 'inversify';

export type LicenseTier = 'FREE' | 'STARTER' | 'ENTERPRISE';

export interface LicenseInfo {
    tier: LicenseTier;
    maxUsers: number | null;
    features: readonly string[];
    expiresAt: Date | null;
    inGracePeriod: boolean;
}

/**
 * Service Provider Interface for licensing and feature entitlements.
 */
export interface LicenseService {
    verify(): Promise<boolean>;
    getLicenseInfo(): LicenseInfo;
    hasFeature(feature: string): boolean;
    getUserLimit(): number | null;
}

/**
 * Upstream AGPLv3 workstation implementation with unrestricted local features.
 */
@injectable()
export class CommunityLicenseService implements LicenseService {
    private static readonly WORKSTATION_FEATURES = ['core_chat', 'workspaces', 'acp_agents', 'workflows', 'tasks'];

    public async verify(): Promise<boolean> {
        return true;
    }

    public getLicenseInfo(): LicenseInfo {
        return {
            tier: 'FREE',
            maxUsers: null,
            features: CommunityLicenseService.WORKSTATION_FEATURES,
            expiresAt: null,
            inGracePeriod: false,
        };
    }

    public hasFeature(feature: string): boolean {
        return CommunityLicenseService.WORKSTATION_FEATURES.includes(feature);
    }

    public getUserLimit(): number | null {
        return null;
    }
}
