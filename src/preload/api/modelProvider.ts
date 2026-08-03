import { ipcRenderer } from 'electron';
import type {ModelProviderLite, ModelProviderCreateInput, NewModel, ProviderWithModels} from '../../../packages/core/dto';

export interface ModelProviderApi {
    addProvider(providerData: ModelProviderCreateInput, models: NewModel[]): Promise<ProviderWithModels>;
    getProviderForId(providerId: string): Promise<ProviderWithModels | undefined>;
    getProviders(): Promise<ModelProviderLite[]>;
    getProvidersWithModels(): Promise<ProviderWithModels[]>;
    deleteProvider(providerId: string): Promise<void>;
    updateProvider(providerId: string, updateObject: Partial<ModelProviderCreateInput>, modelsData: NewModel[]): Promise<ProviderWithModels>;
    getAvailableModelsFromProviders(provider: ModelProviderCreateInput): Promise<NewModel[]>;
}

export const modelProviderApi: ModelProviderApi = {
    addProvider: (providerData: ModelProviderCreateInput, models: NewModel[]) => ipcRenderer.invoke('modelProvider:addProvider', providerData, models),
    getProviderForId: (providerId: string) => ipcRenderer.invoke('modelProvider:getProviderForId', providerId),
    getProviders: () => ipcRenderer.invoke('modelProvider:getProviders'),
    getProvidersWithModels: () => ipcRenderer.invoke('modelProvider:getProvidersWithModels'),
    deleteProvider: (providerId: string) => ipcRenderer.invoke('modelProvider:deleteProvider', providerId),
    updateProvider: (providerId: string, updateObject: Partial<ModelProviderCreateInput>, modelsData: NewModel[]) => ipcRenderer.invoke('modelProvider:updateProvider', providerId, updateObject, modelsData),
    getAvailableModelsFromProviders: (provider: ModelProviderCreateInput) => ipcRenderer.invoke('modelProvider:getAvailableModelsFromProviders', provider)
};
