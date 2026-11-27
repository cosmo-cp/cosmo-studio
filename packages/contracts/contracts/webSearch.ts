import type { WebSearchProviderTypeEnum } from 'core/database/schema/webSearchConfigSchema';
import type { WebSearchConfigSaveInput, WebSearchConfigView } from 'core/dto';

export interface WebSearchApi {
    getConfig(type: WebSearchProviderTypeEnum): Promise<WebSearchConfigView | null>;
    saveConfig(input: WebSearchConfigSaveInput): Promise<WebSearchConfigView>;
    deleteConfig(type: WebSearchProviderTypeEnum): Promise<void>;
}
