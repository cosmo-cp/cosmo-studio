import { inject, injectable } from 'inversify';
import { WebSearchProviderTypeEnum } from '../database/schema/webSearchConfigSchema';
import { WebSearchConfig, WebSearchConfigSaveInput, WebSearchConfigView } from '../dto';
import { Base64SecretStore, type SecretStore } from '../platform/SecretStore';
import { WebSearchConfigRepository } from '../repositories/WebSearchConfigRepository';
import { CORETYPES } from '../types/types';

@injectable()
export class WebSearchConfigService {
    constructor(
        @inject(CORETYPES.WebSearchConfigRepository)
        private repository: WebSearchConfigRepository,
        @inject(CORETYPES.SecretStore)
        private readonly secretStore: SecretStore = new Base64SecretStore(),
    ) {}

    // Return a renderer-safe view of one web-search provider configuration.
    public async getConfig(type: WebSearchProviderTypeEnum): Promise<WebSearchConfigView | null> {
        const config = await this.repository.getByType(type, { withApiKey: false });
        if (!config) {
            return null;
        }

        return {
            ...config,
            createdAt: new Date(config.createdAt),
            updatedAt: config.updatedAt ? new Date(config.updatedAt) : null,
            hasApiKey: true,
        };
    }

    // Create or update a provider config while preserving an existing key if the user leaves it blank.
    public async saveConfig(input: WebSearchConfigSaveInput): Promise<WebSearchConfigView> {
        const existingConfig = await this.getRuntimeConfig(input.type);
        const trimmedApiKey = input.apiKey?.trim();
        const apiKey = trimmedApiKey || existingConfig?.apiKey;

        if (!apiKey) {
            throw new Error('API key is required.');
        }

        if (existingConfig) {
            const updated = await this.repository.updateByType(input.type, {
                enabled: input.enabled,
                apiKey: trimmedApiKey ? apiKey : undefined,
            });
            return {
                ...updated,
                createdAt: new Date(updated.createdAt),
                updatedAt: updated.updatedAt ? new Date(updated.updatedAt) : null,
                hasApiKey: true,
            };
        }

        const created = await this.repository.create({
            type: input.type,
            enabled: input.enabled,
            apiKey: apiKey,
        });
        return {
            ...created,
            createdAt: new Date(created.createdAt),
            updatedAt: created.updatedAt ? new Date(created.updatedAt) : null,
            hasApiKey: true,
        };
    }

    // Remove a stored provider config when the user disables web search entirely.
    public async deleteConfig(type: WebSearchProviderTypeEnum): Promise<void> {
        await this.repository.deleteByType(type);
    }

    // Provide the decrypted config for runtime tool construction in the main process.
    public async getRuntimeConfig(type: WebSearchProviderTypeEnum): Promise<WebSearchConfig | null> {
        const config = await this.repository.getByType(type, { withApiKey: true });
        if (!config || !('apiKey' in config)) {
            return null;
        }

        return {
            ...config,
            apiKey: this.decryptApiKey(config.apiKey),
            createdAt: new Date(config.createdAt),
            updatedAt: config.updatedAt ? new Date(config.updatedAt) : null,
        };
    }

    // Return the decrypted Exa config only when the provider is configured and enabled.
    public async getEnabledExaConfig(): Promise<WebSearchConfig | null> {
        const config = await this.getRuntimeConfig(WebSearchProviderTypeEnum.EXA);
        if (!config?.enabled) {
            return null;
        }
        return config;
    }

    private decryptApiKey(encryptedKey: string): string {
        return this.secretStore.decrypt(encryptedKey);
    }
}
