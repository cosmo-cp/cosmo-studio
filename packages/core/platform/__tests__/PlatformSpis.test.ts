import { beforeEach, describe, expect, it } from 'vitest';
import { coreContainer } from '../../inversify.config';
import { CORETYPES } from '../../types/types';
import { LOCAL_DEFAULT_TENANT_ID, SingleUserAuthContext, type AuthContext } from '../AuthContext';
import { HostProcessComputeDriver } from '../HostProcessComputeDriver';
import { CommunityLicenseService, type LicenseService } from '../LicenseService';
import { NoOpTelemetryEmitter, type TelemetryEmitter } from '../TelemetryEmitter';

describe('Platform SPI defaults', () => {
    beforeEach(() => {
        coreContainer.snapshot();
    });

    it('provides valid community license defaults without network access', async () => {
        const licenseService = new CommunityLicenseService();
        await expect(licenseService.verify()).resolves.toBe(true);
        expect(licenseService.getUserLimit()).toBeNull();
        expect(licenseService.getLicenseInfo()).toEqual({
            tier: 'FREE',
            maxUsers: null,
            features: ['core_chat', 'workspaces', 'acp_agents', 'workflows', 'tasks'],
            expiresAt: null,
            inGracePeriod: false,
        });
        expect(licenseService.hasFeature('core_chat')).toBe(true);
        expect(licenseService.hasFeature('analytics')).toBe(false);
    });

    it('resolves deterministic single-user identity and tenant defaults', () => {
        const authContext = new SingleUserAuthContext();
        expect(authContext.getCurrentIdentity()).toEqual({
            userId: LOCAL_DEFAULT_TENANT_ID,
            organizationId: LOCAL_DEFAULT_TENANT_ID,
            role: 'org_admin',
            isSuperAdmin: false,
        });
    });

    it('handles no-op telemetry emission and flush without side effects', async () => {
        const emitter = new NoOpTelemetryEmitter();
        emitter.emitTokenUsage({
            sourceType: 'chat',
            sourceId: 'chat-1',
            modelId: 'gpt-4o',
            providerId: 'openai',
            promptTokens: 10,
            completionTokens: 20,
            totalTokens: 30,
            latencyMs: 120,
        });
        emitter.emitToolExecution({
            toolName: 'bash',
            executionTimeMs: 50,
            status: 'success',
        });
        await expect(emitter.flush()).resolves.toBeUndefined();
    });

    it('binds platform SPIs cleanly in coreContainer', () => {
        expect(coreContainer.get<LicenseService>(CORETYPES.LicenseService)).toBeInstanceOf(CommunityLicenseService);
        expect(coreContainer.get<TelemetryEmitter>(CORETYPES.TelemetryEmitter)).toBeInstanceOf(NoOpTelemetryEmitter);
        expect(coreContainer.get<AuthContext>(CORETYPES.AuthContext)).toBeInstanceOf(SingleUserAuthContext);
        expect(coreContainer.get(CORETYPES.ComputeRuntimeDriver)).toBeInstanceOf(HostProcessComputeDriver);
        coreContainer.restore();
    });
});
