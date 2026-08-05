import { ipcRenderer } from 'electron';
import type { ModelProviderCreateInput, NewModel } from '../../../packages/core/dto';
import type { ModelProviderApi } from '../contracts/modelProvider';

export const modelProviderApi: ModelProviderApi = {
    addProvider: (providerData: ModelProviderCreateInput, models: NewModel[]) => {
        return ipcRenderer.invoke('modelProvider:addProvider', providerData, models);
    },
    getProviderForId: (providerId: string) => {
        return ipcRenderer.invoke('modelProvider:getProviderForId', providerId);
    },
    getProviders: () => {
        return ipcRenderer.invoke('modelProvider:getProviders');
    },
    getProvidersWithModels: () => {
        return ipcRenderer.invoke('modelProvider:getProvidersWithModels');
    },
    deleteProvider: (providerId: string) => {
        return ipcRenderer.invoke('modelProvider:deleteProvider', providerId);
    },
    updateProvider: (providerId: string, updateObject: Partial<ModelProviderCreateInput>, modelsData: NewModel[]) => {
        return ipcRenderer.invoke('modelProvider:updateProvider', providerId, updateObject, modelsData);
    },
    getAvailableModelsFromProviders: (provider: ModelProviderCreateInput) => {
        return ipcRenderer.invoke('modelProvider:getAvailableModelsFromProviders', provider);
    },
};
