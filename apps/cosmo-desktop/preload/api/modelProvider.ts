import type { ModelProviderApi } from 'contracts/contracts/modelProvider';
import type { ModelProviderCreateInput, NewModel } from 'core/dto';
import { ipcRenderer } from 'electron';

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
