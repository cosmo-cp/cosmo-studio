import { ipcRenderer } from 'electron';
import type { WebSearchProviderTypeEnum } from '../../../packages/core/database/schema/webSearchConfigSchema';
import type { WebSearchConfigSaveInput } from '../../../packages/core/dto';
import type { WebSearchApi } from '../contracts/webSearch';

export const webSearchApi: WebSearchApi = {
    getConfig: (type: WebSearchProviderTypeEnum) => {
        return ipcRenderer.invoke('webSearch:getConfig', type);
    },
    saveConfig: (input: WebSearchConfigSaveInput) => {
        return ipcRenderer.invoke('webSearch:saveConfig', input);
    },
    deleteConfig: (type: WebSearchProviderTypeEnum) => {
        return ipcRenderer.invoke('webSearch:deleteConfig', type);
    },
};
