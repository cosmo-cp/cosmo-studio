import { ipcRenderer } from 'electron';
import type { WebSearchConfigSaveInput, WebSearchConfigView } from '../../../packages/core/dto';
import type { WebSearchProviderTypeEnum } from '../../../packages/core/database/schema/webSearchConfigSchema';
import { callRpc } from './common';

export interface WebSearchApi {
    getConfig(type: WebSearchProviderTypeEnum): Promise<WebSearchConfigView | null>;

    saveConfig(input: WebSearchConfigSaveInput): Promise<WebSearchConfigView>;

    deleteConfig(type: WebSearchProviderTypeEnum): Promise<void>;
}

export const webSearchRpcApi: WebSearchApi = {
    getConfig: (type: WebSearchProviderTypeEnum) => ipcRenderer.invoke('webSearch:getConfig', type),
    saveConfig: (input: WebSearchConfigSaveInput) => ipcRenderer.invoke('webSearch:saveConfig', input),
    deleteConfig: (type: WebSearchProviderTypeEnum) => ipcRenderer.invoke('webSearch:deleteConfig', type),
};

export const webSearchHttpApi: WebSearchApi = {
    getConfig: (type: WebSearchProviderTypeEnum) => callRpc<WebSearchConfigView | null>('webSearch', 'getConfig', [type]),
    saveConfig: (input: WebSearchConfigSaveInput) => callRpc<WebSearchConfigView>('webSearch', 'saveConfig', [input]),
    deleteConfig: (type: WebSearchProviderTypeEnum) => callRpc<void>('webSearch', 'deleteConfig', [type]),
};
