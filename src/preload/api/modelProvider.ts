import { ipcRenderer } from 'electron';
import type {
    ModelProviderCreateInput,
    ModelProviderLite,
    NewModel,
    ProviderWithModels,
} from '../../../packages/core/dto';
import { callRpc } from './common';

export interface ModelProviderApi {
    addProvider(providerData: ModelProviderCreateInput, models: NewModel[]): Promise<ProviderWithModels>;

    getProviderForId(providerId: string): Promise<ProviderWithModels | undefined>;

    getProviders(): Promise<ModelProviderLite[]>;

    getProvidersWithModels(): Promise<ProviderWithModels[]>;

    deleteProvider(providerId: string): Promise<void>;

    updateProvider(providerId: string, updateObject: Partial<ModelProviderCreateInput>, modelsData: NewModel[]): Promise<ProviderWithModels>;

    getAvailableModelsFromProviders(provider: ModelProviderCreateInput): Promise<NewModel[]>;
}

export const modelProviderRpcApi: ModelProviderApi = {
    addProvider: (providerData: ModelProviderCreateInput, models: NewModel[]) => ipcRenderer.invoke('modelProvider:addProvider', providerData, models),
    getProviderForId: (providerId: string) => ipcRenderer.invoke('modelProvider:getProviderForId', providerId),
    getProviders: () => ipcRenderer.invoke('modelProvider:getProviders'),
    getProvidersWithModels: () => ipcRenderer.invoke('modelProvider:getProvidersWithModels'),
    deleteProvider: (providerId: string) => ipcRenderer.invoke('modelProvider:deleteProvider', providerId),
    updateProvider: (providerId: string, updateObject: Partial<ModelProviderCreateInput>, modelsData: NewModel[]) => ipcRenderer.invoke('modelProvider:updateProvider', providerId, updateObject, modelsData),
    getAvailableModelsFromProviders: (provider: ModelProviderCreateInput) => ipcRenderer.invoke('modelProvider:getAvailableModelsFromProviders', provider),
};
export const modelProviderHttpApi: ModelProviderApi = {
    addProvider: (providerData: ModelProviderCreateInput, models: NewModel[]) => callRpc<ProviderWithModels>('modelProvider', 'addProvider', [providerData, models]),
    getProviderForId: (providerId: string) => callRpc<ProviderWithModels | undefined>('modelProvider', 'getProviderForId', [providerId]),
    getProviders: () => callRpc<ModelProviderLite[]>('modelProvider', 'getProviders', []),
    getProvidersWithModels: () => callRpc<ProviderWithModels[]>('modelProvider', 'getProvidersWithModels', []),
    deleteProvider: (providerId: string) => callRpc<void>('modelProvider', 'deleteProvider', [providerId]),
    updateProvider: (providerId: string, updateObject: Partial<ModelProviderCreateInput>, modelsData: NewModel[]) => callRpc<ProviderWithModels>('modelProvider', 'updateProvider', [providerId, updateObject, modelsData]),
    getAvailableModelsFromProviders: (provider: ModelProviderCreateInput) => callRpc<NewModel[]>('modelProvider', 'getAvailableModelsFromProviders', [provider]),
};
