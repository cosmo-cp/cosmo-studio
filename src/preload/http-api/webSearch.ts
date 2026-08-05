import type { WebSearchProviderTypeEnum } from '../../../packages/core/database/schema/webSearchConfigSchema';
import type { WebSearchConfigSaveInput, WebSearchConfigView } from '../../../packages/core/dto';
import { callRpc } from '../api/common';
import type { WebSearchApi } from '../contracts/webSearch';

export const webSearchHttpApi: WebSearchApi = {
    getConfig: (type: WebSearchProviderTypeEnum) => {
        return callRpc<WebSearchConfigView | null>('webSearch', 'getConfig', [type]);
    },
    saveConfig: (input: WebSearchConfigSaveInput) => {
        return callRpc<WebSearchConfigView>('webSearch', 'saveConfig', [input]);
    },
    deleteConfig: (type: WebSearchProviderTypeEnum) => {
        return callRpc<void>('webSearch', 'deleteConfig', [type]);
    },
};
