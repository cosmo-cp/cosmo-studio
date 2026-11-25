import { homedir } from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CosmoPaths } from '../CosmoPaths';

describe('CosmoPaths', () => {
    const originalEnv = process.env.COSMO_HOME;

    beforeEach(() => {
        delete process.env.COSMO_HOME;
    });

    afterEach(() => {
        if (originalEnv !== undefined) {
            process.env.COSMO_HOME = originalEnv;
        } else {
            delete process.env.COSMO_HOME;
        }
    });

    it('resolves standard ~/.cosmo-studio paths by default', () => {
        const expectedHome = path.join(homedir(), '.cosmo-studio');
        expect(CosmoPaths.getHomeDir()).toBe(expectedHome);
        expect(CosmoPaths.getSkillsDir()).toBe(path.join(expectedHome, 'skills'));
        expect(CosmoPaths.getAcpAgentsDir()).toBe(path.join(expectedHome, 'acp-agents'));
        expect(CosmoPaths.getRuntimeDir()).toBe(path.join(expectedHome, 'runtime'));
        expect(CosmoPaths.getRuntimeDir('node')).toBe(path.join(expectedHome, 'runtime', 'node'));
    });

    it('respects COSMO_HOME override', () => {
        process.env.COSMO_HOME = '/tmp/custom-cosmo';
        expect(CosmoPaths.getHomeDir()).toBe('/tmp/custom-cosmo');
        expect(CosmoPaths.getSkillsDir()).toBe('/tmp/custom-cosmo/skills');
        expect(CosmoPaths.getAcpAgentsDir()).toBe('/tmp/custom-cosmo/acp-agents');
        expect(CosmoPaths.getRuntimeDir('node')).toBe('/tmp/custom-cosmo/runtime/node');
    });
});
