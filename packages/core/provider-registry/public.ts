import rawRegistry from './registry.json';
import type { PublicProviderDefinitionV1, PublicProviderRegistryV1 } from './types';
import { validateProviderRegistry } from './validation';

export const PROVIDER_ICON_KEYS = new Set([
    'anthropic',
    'cohere',
    'custom',
    'deepseek',
    'google',
    'groq',
    'huggingface',
    'lmstudio',
    'mistral',
    'moonshotai',
    'ollama',
    'openai',
    'perplexity',
    'xai',
]);

export const DECLARED_PROVIDER_ADAPTER_KEYS = new Set([
    'anthropic-native',
    'cohere-native',
    'deepseek-native',
    'gateway-compatible',
    'google-native',
    'groq-native',
    'huggingface-native',
    'mistral-native',
    'moonshot-native',
    'ollama-local',
    'openai-compatible',
    'openai-native',
    'perplexity-native',
    'xai-native',
]);

export const DISCOVERY_ADAPTER_KEYS = new Set(['lmstudio-model-list-v1', 'ollama-model-list-v1']);

const registry = validateProviderRegistry(rawRegistry, {
    adapterKeys: DECLARED_PROVIDER_ADAPTER_KEYS,
    discoveryAdapterKeys: DISCOVERY_ADAPTER_KEYS,
    iconKeys: PROVIDER_ICON_KEYS,
});

// Removes every backend-only key before definitions cross the process boundary.
function createPublicDefinition(provider: (typeof registry.providers)[number]): PublicProviderDefinitionV1 {
    return {
        id: provider.id,
        version: provider.version,
        ...(provider.aliases ? { aliases: provider.aliases } : {}),
        display: provider.display,
        support: provider.support,
        fields: provider.fields,
        discovery: {
            strategy: provider.discovery.strategy,
            allowManualModels: provider.discovery.allowManualModels,
        },
        capabilities: provider.capabilities,
    };
}

export const PublicProviderRegistry: PublicProviderRegistryV1 = {
    version: registry.version,
    providers: registry.providers.map(createPublicDefinition),
};

export const PublicProviderRegistryById = new Map(
    PublicProviderRegistry.providers.map((provider) => {
        return [provider.id, provider];
    }),
);
