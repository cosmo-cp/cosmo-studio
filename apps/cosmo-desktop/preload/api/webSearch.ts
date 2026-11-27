import type { WebSearchApi } from 'contracts/contracts/webSearch';
import type { WebSearchProviderTypeEnum } from 'core/database/schema/webSearchConfigSchema';
import type { WebSearchConfigSaveInput } from 'core/dto';
import { ipcRenderer } from 'electron';

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
