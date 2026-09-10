import { describe, expect, it } from 'vitest';
import { getProviderAdapter, PROVIDER_ADAPTERS } from './adapters';

describe('provider adapters', () => {
    const adapter = getProviderAdapter('openai-compatible');

    it('uses stable reviewed keys and supports shared compatible-provider construction', () => {
        expect(adapter).toBeDefined();
        expect(adapter?.apiVersion).toBe(1);
        expect(getProviderAdapter('missing')).toBeUndefined();
        expect(PROVIDER_ADAPTERS.has('gateway-compatible')).toBe(true);

        const first = adapter?.createProvider({
            providerId: 'compatible-one',
            displayName: 'Compatible One',
            apiKey: 'one',
            baseURL: 'https://one.example/v1',
        });
        const second = adapter?.createProvider({
            providerId: 'compatible-two',
            displayName: 'Compatible Two',
            apiKey: 'two',
            baseURL: 'https://two.example/v1',
        });

        expect(first).toBeDefined();
        expect(second).toBeDefined();
        expect(first).not.toBe(second);
    });

    it('constructs every installed native, local, compatible, and gateway adapter', () => {
        for (const [key, installedAdapter] of PROVIDER_ADAPTERS) {
            expect(() => {
                return installedAdapter.createProvider({
                    providerId: key,
                    displayName: key,
                    apiKey: 'key',
                    baseURL: 'https://provider.example/v1',
                });
            }).not.toThrow();
        }

        expect(() => {
            return getProviderAdapter('ollama-local')?.createProvider({ providerId: 'ollama', displayName: 'Ollama' });
        }).not.toThrow();
        expect(() => {
            return getProviderAdapter('openai-compatible')?.createProvider({
                providerId: 'lmstudio',
                displayName: 'LM Studio',
            });
        }).not.toThrow();
        expect(() => {
            return getProviderAdapter('gateway-compatible')?.createProvider({
                providerId: 'gateway',
                displayName: 'Gateway',
            });
        }).not.toThrow();
        expect(() => {
            return getProviderAdapter('openai-native')?.createProvider({
                providerId: 'openai',
                displayName: 'OpenAI',
            });
        }).not.toThrow();
    });

    it.each([
        [{ extra: true }, { route: 'direct' as const }, 'unknown-field'],
        [{ apiKey: 42 }, { route: 'direct' as const }, 'invalid-api-key'],
        [{ baseURL: 42 }, { route: 'direct' as const }, 'invalid-base-url'],
        [{ baseURL: 'not a URL' }, { route: 'direct' as const }, 'invalid-base-url'],
        [{ baseURL: 'http://remote.example' }, { route: 'direct' as const }, 'unsafe-base-url'],
        [{ baseURL: 'http://remote.example' }, { route: 'compatible' as const }, 'unsafe-base-url'],
        [{ baseURL: 'ftp://remote.example' }, { route: 'local' as const }, 'unsafe-base-url'],
    ])('rejects unsafe connection input %#', (input, context, code) => {
        expect(adapter?.validateConnection(input, context)).toMatchObject({ valid: false, code: code });
    });

    it.each([
        ['', 'direct' as const],
        ['https://remote.example', 'direct' as const],
        ['http://localhost:1234', 'compatible' as const],
        ['http://private-host:11434', 'local' as const],
    ])('accepts endpoint %s for the %s route', (baseURL, route) => {
        expect(adapter?.validateConnection({ baseURL: baseURL }, { route: route })).toMatchObject({ valid: true });
    });

    it('normalizes connection values idempotently', () => {
        const once = adapter?.normalizeConnection({ apiKey: ' key ', baseURL: ' https://example.com/v1/// ' });
        const twice = adapter?.normalizeConnection(once ?? {});

        expect(once).toEqual({ apiKey: 'key', baseURL: 'https://example.com/v1' });
        expect(twice).toEqual(once);
        expect(adapter?.normalizeConnection({ apiKey: true, baseURL: 5 })).toEqual({ apiKey: true, baseURL: 5 });
    });

    it('returns safe unavailable and cancellation results for connection tests', async () => {
        const active = new AbortController();
        await expect(
            adapter?.testConnection({ providerId: 'custom', displayName: 'Custom' }, active.signal),
        ).resolves.toMatchObject({ ok: false, code: 'connection-test-unavailable' });

        const aborted = new AbortController();
        aborted.abort();
        await expect(
            adapter?.testConnection({ providerId: 'custom', displayName: 'Custom' }, aborted.signal),
        ).resolves.toMatchObject({ ok: false, code: 'aborted' });
    });
});
