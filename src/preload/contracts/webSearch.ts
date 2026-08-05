import type { WebSearchProviderTypeEnum } from '../../../packages/core/database/schema/webSearchConfigSchema';
import type { WebSearchConfigSaveInput, WebSearchConfigView } from '../../../packages/core/dto';

export interface WebSearchApi {
    getConfig(type: WebSearchProviderTypeEnum): Promise<WebSearchConfigView | null>;
    saveConfig(input: WebSearchConfigSaveInput): Promise<WebSearchConfigView>;
    deleteConfig(type: WebSearchProviderTypeEnum): Promise<void>;
}
