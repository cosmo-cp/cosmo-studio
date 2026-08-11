import { WebSearchProviderTypeEnum } from 'core/database/schema/webSearchConfigSchema';
import type { WebSearchConfigSaveInput, WebSearchConfigView } from 'core/dto';
import { WebSearchConfigService } from 'core/services/WebSearchConfigService';
import { CORETYPES } from 'core/types/types';
import { inject, injectable } from 'inversify';
import { z } from 'zod';
import { IpcController, IpcHandler } from '../ipc/Decorators';
import { Controller } from './Controller';

const providerTypeSchema = z.nativeEnum(WebSearchProviderTypeEnum);

const webSearchConfigSaveSchema = z
    .object({
        type: providerTypeSchema,
        enabled: z.boolean(),
        apiKey: z.preprocess((value) => {
            if (typeof value !== 'string') {
                return value;
            }
            const trimmedValue = value.trim();
            return trimmedValue === '' ? undefined : trimmedValue;
        }, z.string().min(1).optional().nullable()),
    })
    .strict();

@injectable()
@IpcController('webSearch')
export class WebSearchController implements Controller {
    constructor(
        @inject(CORETYPES.WebSearchConfigService)
        private webSearchConfigService: WebSearchConfigService,
    ) {}

    // Load one renderer-safe web-search provider config for the settings page.
    @IpcHandler('getConfig', z.tuple([providerTypeSchema]))
    public async getConfig(type: WebSearchProviderTypeEnum): Promise<WebSearchConfigView | null> {
        const parsedType = providerTypeSchema.parse(type);
        return this.webSearchConfigService.getConfig(parsedType);
    }

    // Save the Exa configuration after validating the untrusted IPC payload.
    @IpcHandler('saveConfig', z.tuple([webSearchConfigSaveSchema]))
    public async saveConfig(input: WebSearchConfigSaveInput): Promise<WebSearchConfigView> {
        const parsedInput = webSearchConfigSaveSchema.parse(input);
        return this.webSearchConfigService.saveConfig(parsedInput);
    }

    // Remove the stored Exa configuration for this workspace.
    @IpcHandler('deleteConfig', z.tuple([providerTypeSchema]))
    public async deleteConfig(type: WebSearchProviderTypeEnum): Promise<void> {
        const parsedType = providerTypeSchema.parse(type);
        return this.webSearchConfigService.deleteConfig(parsedType);
    }
}
