import { useBackendMutation, useBackendQuery } from '@/lib/store/backend-hooks';
import type { ModelProviderCreateInput, NewModel } from 'core/dto';

const providerKeys = {
    list: ['providers', 'list'] as const,
};

export function useGetProvidersQuery() {
    return useBackendQuery(providerKeys.list, (appDataSource) => appDataSource.modelProvider.getProvidersWithModels());
}

export function useGetAvailableModelsForProviderMutation() {
    return useBackendMutation({
        errorMessage: 'Failed to load models for this provider',
        run: (appDataSource, provider: ModelProviderCreateInput) =>
            appDataSource.modelProvider.getAvailableModelsFromProviders(provider),
    });
}

export function useSaveProviderMutation() {
    return useBackendMutation({
        errorMessage: 'Failed to save provider',
        run: (
            appDataSource,
            payload: { providerId?: string; providerData: ModelProviderCreateInput; models: NewModel[] },
        ) =>
            payload.providerId
                ? appDataSource.modelProvider.updateProvider(payload.providerId, payload.providerData, payload.models)
                : appDataSource.modelProvider.addProvider(payload.providerData, payload.models),
        revalidate: async (_arg, _result, { revalidateKeys }) => {
            await revalidateKeys([providerKeys.list]);
        },
    });
}

export function useDeleteProviderMutation() {
    return useBackendMutation({
        errorMessage: 'Failed to delete provider',
        run: (appDataSource, providerId: string) => appDataSource.modelProvider.deleteProvider(providerId),
        revalidate: async (_arg, _result, { revalidateKeys }) => {
            await revalidateKeys([providerKeys.list]);
        },
    });
}
