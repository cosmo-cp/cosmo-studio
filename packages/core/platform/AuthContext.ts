import { injectable } from 'inversify';

export const LOCAL_DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';

export type TenantRole = 'super_admin' | 'org_admin' | 'user';

export interface AuthIdentity {
    userId: string;
    organizationId: string;
    role: TenantRole;
    isSuperAdmin: boolean;
}

/**
 * Service Provider Interface resolving the active caller identity and tenant context.
 */
export interface AuthContext {
    getCurrentIdentity(): AuthIdentity;
}

/**
 * Local workstation AuthContext resolving to the deterministic single-user tenant UUID.
 */
@injectable()
export class SingleUserAuthContext implements AuthContext {
    public getCurrentIdentity(): AuthIdentity {
        return {
            userId: LOCAL_DEFAULT_TENANT_ID,
            organizationId: LOCAL_DEFAULT_TENANT_ID,
            role: 'org_admin',
            isSuperAdmin: false,
        };
    }
}
