import { describe, expect, it } from 'vitest';
import { AppModule } from './AppModule';
import { getEnterpriseModules } from './ee-stub/enterprise-modules';

describe('AppModule EE extension hook', () => {
    it('returns empty enterprise module list in Studio and wires AppModule cleanly', () => {
        expect(getEnterpriseModules()).toEqual([]);
        expect(AppModule).toBeDefined();
    });
});
