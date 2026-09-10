import { getProviderAdapter, PROVIDER_ADAPTERS } from './adapters';
import { DISCOVERY_ADAPTER_KEYS, PROVIDER_ICON_KEYS, PublicProviderRegistry } from './public';
import rawRegistry from './registry.json';
import { validateProviderRegistry } from './validation';

export * from './types';
export { getProviderAdapter, PublicProviderRegistry };

export const ProviderRegistry = validateProviderRegistry(rawRegistry, {
    adapterKeys: new Set(PROVIDER_ADAPTERS.keys()),
    discoveryAdapterKeys: DISCOVERY_ADAPTER_KEYS,
    iconKeys: PROVIDER_ICON_KEYS,
});

export const ProviderRegistryById = new Map(
    ProviderRegistry.providers.map((provider) => {
        return [provider.id, provider];
    }),
);
