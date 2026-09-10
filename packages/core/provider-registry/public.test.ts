import { describe, expect, it } from 'vitest';
import { PublicProviderRegistry } from './public';

describe('public provider registry', () => {
    it('is serializable and omits backend execution and migration metadata', () => {
        const serialized = JSON.stringify(PublicProviderRegistry);
        const parsed = JSON.parse(serialized) as { providers: Array<Record<string, unknown>> };

        expect(parsed.providers).toHaveLength(14);
        for (const provider of parsed.providers) {
            expect(provider).not.toHaveProperty('adapter');
            expect(provider).not.toHaveProperty('validation');
            expect(provider).not.toHaveProperty('migrations');
            expect(provider).not.toHaveProperty('factory');
            expect(provider.discovery).not.toHaveProperty('adapterKey');
            expect(provider.discovery).not.toHaveProperty('sourceKey');
        }
        expect(serialized).not.toContain('never-public');
        expect(serialized).not.toContain('apiKey":"');
    });
});
