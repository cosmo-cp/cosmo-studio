import { ModelProviderTypeEnum } from './database/schema/modelProviderSchema';
import { PublicProviderRegistry } from './provider-registry/public';

export type ProviderCatalogEntry = {
    type: ModelProviderTypeEnum;
    name: string;
    description: string;
    modelsSource: 'models-dev' | 'ollama' | 'lmstudio' | 'none';
    modelsDevKey?: string;
};

export const ProviderCatalog: ProviderCatalogEntry[] = PublicProviderRegistry.providers.map((provider) => {
    return {
        type: provider.id as ModelProviderTypeEnum,
        name: provider.display.name,
        description: provider.display.description,
        modelsSource:
            provider.discovery.strategy === 'models-dev'
                ? 'models-dev'
                : provider.id === ModelProviderTypeEnum.OLLAMA
                  ? 'ollama'
                  : provider.id === ModelProviderTypeEnum.LMSTUDIO
                    ? 'lmstudio'
                    : 'none',
        ...(provider.discovery.strategy === 'models-dev' ? { modelsDevKey: provider.id } : {}),
    };
});

export const ProviderCatalogByType = ProviderCatalog.reduce(
    (acc, entry) => {
        acc[entry.type] = entry;
        return acc;
    },
    {} as Record<ModelProviderTypeEnum, ProviderCatalogEntry>,
);
