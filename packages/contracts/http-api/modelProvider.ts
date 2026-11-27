import type { ModelProviderCreateInput, ModelProviderLite, NewModel, ProviderWithModels } from 'core/dto';
import type { ModelProviderApi } from '../contracts/modelProvider';
import { callRpc } from './common';

export const modelProviderHttpApi: ModelProviderApi = {
    addProvider: (providerData: ModelProviderCreateInput, models: NewModel[]) => {
        return callRpc<ProviderWithModels>('modelProvider', 'addProvider', [providerData, models]);
    },
    getProviderForId: (providerId: string) => {
        return callRpc<ProviderWithModels | undefined>('modelProvider', 'getProviderForId', [providerId]);
    },
    getProviders: () => {
        return callRpc<ModelProviderLite[]>('modelProvider', 'getProviders', []);
    },
    getProvidersWithModels: () => {
        return callRpc<ProviderWithModels[]>('modelProvider', 'getProvidersWithModels', []);
    },
    deleteProvider: (providerId: string) => {
        return callRpc<void>('modelProvider', 'deleteProvider', [providerId]);
    },
    updateProvider: (providerId: string, updateObject: Partial<ModelProviderCreateInput>, modelsData: NewModel[]) => {
        return callRpc<ProviderWithModels>('modelProvider', 'updateProvider', [providerId, updateObject, modelsData]);
    },
    getAvailableModelsFromProviders: (provider: ModelProviderCreateInput) => {
        return callRpc<NewModel[]>('modelProvider', 'getAvailableModelsFromProviders', [provider]);
    },
};
