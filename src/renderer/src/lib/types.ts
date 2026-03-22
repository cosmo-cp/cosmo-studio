import { ModelProviderTypeEnum } from 'core/database/schema/modelProviderSchema';
import { ProviderCatalogByType } from 'core/providerCatalog';

export interface Attachment {
    name: string;
    url: string;
    contentType: string;
}

export const ProviderInfo: Record<ModelProviderTypeEnum, { name: string; description: string }> = Object.values(
    ProviderCatalogByType,
).reduce(
    (acc, entry) => {
        acc[entry.type] = { name: entry.name, description: entry.description };
        return acc;
    },
    {} as Record<ModelProviderTypeEnum, { name: string; description: string }>,
);
