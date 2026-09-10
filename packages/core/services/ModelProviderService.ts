import type { ProviderV4 } from '@ai-sdk/provider';
import { createProviderRegistry, ProviderRegistryProvider } from 'ai';
import { inject, injectable } from 'inversify';
import { ModelModalityEnum, ModelProviderTypeEnum, ModelStatusEnum } from '../database/schema/modelProviderSchema';
import { ModelProviderCreateInput, ModelProviderLite, NewModel, ProviderWithModels } from '../dto';
import type { CoreLogger } from '../platform/CoreLogger';
import { getCoreLogger } from '../platform/CoreLogger';
import { Base64SecretStore, type SecretStore } from '../platform/SecretStore';
import {
    getProviderAdapter,
    ProviderRegistryById,
    PublicProviderRegistry,
    type PublicProviderRegistryV1,
} from '../provider-registry';
import { ProviderCatalogByType } from '../providerCatalog';
import { ModelProviderRepository } from '../repositories/ModelProviderRepository';
import { CORETYPES } from '../types/types';

interface LMStudioModelPayload {
    id: string;
    key?: string;
    display_name?: string;
    description?: string;
    max_context_length?: number;
    capabilities?: {
        reasoning?: boolean;
        vision?: boolean;
        trained_for_tool_use?: boolean;
    };
}

@injectable()
export class ModelProviderService {
    private readonly repository: ModelProviderRepository;
    private modelProviderRegistry: ProviderRegistryProvider = createProviderRegistry({});
    private static MODELS_DOT_DEV_URL = 'https://models.dev/api.json';
    private static MODELS_OLLAMA_URL = 'http://127.0.0.1:11434/api';
    private static MODELS_LMSTUDIO_URL = 'http://localhost:1234/api';
    private static DEFAULT_CONTEXT_WINDOW = 128000;
    private static DEFAULT_MAX_OUTPUT_WINDOW = 4096;
    constructor(
        @inject(CORETYPES.ModelProviderRepository) repository: ModelProviderRepository,
        @inject(CORETYPES.SecretStore) private readonly secretStore: SecretStore = new Base64SecretStore(),
    ) {
        this.repository = repository;
        this.updateModelProviderRegistry();
    }

    private async isDuplicate(provider: ModelProviderCreateInput): Promise<boolean> {
        const providers = await this.repository.findDuplicates(provider);
        return providers.length > 0;
    }

    // Accepts ModelProviderCreateInput directly, relying on the caller/UI for data integrity.
    public async addProvider(
        providerData: ModelProviderCreateInput,
        modelsData: NewModel[],
    ): Promise<ProviderWithModels> {
        if (!providerData.name || providerData.name.trim().length === 0) {
            throw new Error('Provider name is required.');
        }

        // Note: Runtime validation (like checking if apiUrl is a valid URL or
        // if type is valid) must now be handled manually or by a different library.

        // 1. Check basic duplication
        if (await this.isDuplicate(providerData)) {
            throw new Error('Duplicate provider entry.');
        }

        // 2. Map input data to the final Drizzle Insert type
        const insertData: ModelProviderCreateInput = {
            name: providerData.name,
            apiKey: providerData.apiKey, // Key is plain text here
            type: providerData.type,
            apiUrl:
                providerData.type === ModelProviderTypeEnum.CUSTOM ? providerData.apiUrl : (providerData.apiUrl ?? ''),
        };

        // 3. Repository handles insertion and encryption
        const result = await this.repository.addProvider(insertData, modelsData);
        this.updateModelProviderRegistry();
        return result;
    }

    public async getProviderForId(providerId: string): Promise<ProviderWithModels | undefined> {
        return this.repository.findProviderById(providerId);
    }

    public async getProviders(input: { withApiKey: boolean }): Promise<ModelProviderLite[]> {
        const providers = await this.repository.findAll({ withApiKey: input.withApiKey });
        return providers.map(this.mapToModelProvider);
    }

    public async getProvidersWithModels(): Promise<ProviderWithModels[]> {
        return this.repository.getAllWithModels();
    }

    // Supplies the same secret-free contract to Electron IPC and HTTP RPC callers.
    public getPublicProviderRegistry(): PublicProviderRegistryV1 {
        return PublicProviderRegistry;
    }

    public async deleteProvider(providerId: string): Promise<void> {
        try {
            await this.repository.deleteProviderById(providerId);
            this.updateModelProviderRegistry();
        } catch (error) {
            this.logger.error('Failed to delete provider', error);
            throw error;
        }
    }

    public async updateProvider(
        providerId: string,
        updateObject: Partial<ModelProviderCreateInput>,
        modelsData?: NewModel[],
    ): Promise<ProviderWithModels> {
        const result = await this.repository.updateProvider(providerId, updateObject, modelsData);
        this.updateModelProviderRegistry();
        return result;
    }

    public async getModelProviderRegistry(): Promise<ProviderRegistryProvider> {
        if (!this.modelProviderRegistry) {
            this.updateModelProviderRegistry();
        }
        return this.modelProviderRegistry;
    }

    private updateModelProviderRegistry() {
        const registryObject: Record<string, ProviderV4> = {};
        this.getProviders({ withApiKey: true })
            .then((providers) => {
                for (const provider of providers) {
                    const definition = ProviderRegistryById.get(provider.type);
                    if (!definition) {
                        this.logger.error(`Provider definition is unavailable: ${provider.type}, ${provider.name}`);
                        continue;
                    }
                    const adapter = getProviderAdapter(definition.adapter.key);
                    if (!adapter) {
                        this.logger.error(
                            `Provider adapter is unavailable: ${definition.adapter.key}, ${provider.name}`,
                        );
                        continue;
                    }

                    try {
                        registryObject[provider.name] = adapter.createProvider({
                            providerId: definition.id,
                            displayName: provider.name,
                            apiKey: provider.apiKey || undefined,
                            baseURL: provider.apiUrl || undefined,
                        });
                    } catch (error) {
                        this.logger.error(
                            `Failed to create provider runtime: ${definition.id}, ${provider.name}`,
                            error,
                        );
                    }
                }
                this.modelProviderRegistry = createProviderRegistry(registryObject);
            })
            .catch((error) => {
                return this.logger.error('Failed to update model provider registry', error);
            });
    }

    /** Maps a DB record (encrypted key) to the application model (decrypted key). */
    private mapToModelProvider = (dbRecord: ModelProviderLite): ModelProviderLite =>
        // Note: You must handle the timestamp conversion here if needed,
        // as we dropped Zod's automatic date coercion.
        {
            return {
                ...dbRecord,
                apiKey: this.decryptApiKey(dbRecord.apiKey),
                createdAt: new Date(dbRecord.createdAt),
                updatedAt: dbRecord.updatedAt ? new Date(dbRecord.updatedAt) : null,
            };
        };

    private decryptApiKey = (encryptedKey?: string): string => {
        if (!encryptedKey) {
            return '';
        }
        return this.secretStore.decrypt(encryptedKey);
    };

    private async fetchLocalModels<T>(
        url: string,
        providerName: string,
        dataKey: string,
        mapper: (item: T) => Partial<NewModel>,
    ): Promise<NewModel[]> {
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });
            if (!response.ok) {
                this.logger.error(`${providerName} API Error:`, await response.text());
                return [];
            }
            const data = await response.json();
            return (data[dataKey] as T[]).map((item) => {
                return {
                    reasoning: false,
                    inputModalities: [],
                    outputModalities: [],
                    ...mapper(item),
                } as NewModel;
            });
        } catch (err) {
            this.logger.error(`${providerName} Models fetch error:`, err);
            return [];
        }
    }

    private async getModelsFromOllama(provider: ModelProviderCreateInput): Promise<NewModel[]> {
        const baseUrl = (provider.apiUrl && provider.apiUrl.trim()) || ModelProviderService.MODELS_OLLAMA_URL;
        const result = await this.fetchLocalModels<{ name: string; model: string; modified_at: number }>(
            baseUrl + '/tags',
            'Ollama',
            'models',
            (m) => {
                return {
                    name: m.name,
                    modelId: m.model,
                    releaseDate: new Date(m.modified_at),
                    lastUpdatedByProvider: new Date(m.modified_at),
                };
            },
        );

        await Promise.all(
            result.map(async (m) => {
                try {
                    const res = await fetch(baseUrl + '/show', {
                        method: 'POST',
                        body: JSON.stringify({ model: m.modelId }),
                        headers: { 'Content-Type': 'application/json' },
                    });
                    if (res.ok) {
                        const data = await res.json();
                        if (data && data.model_info) {
                            const ctxKey = Object.keys(data.model_info).find((k) => {
                                return k.endsWith('.context_length');
                            });
                            if (ctxKey && typeof data.model_info[ctxKey] === 'number') {
                                m.contextWindow = data.model_info[ctxKey];
                            }
                        }
                    }
                } catch (e) {
                    getCoreLogger().error(`Ollama /show failed for ${m.modelId}`, e);
                }
            }),
        );

        return result.sort((a, b) => {
            return this.compareProviderUpdateDates(a, b);
        });
    }

    private async getModelsFromLMStudio(provider: ModelProviderCreateInput): Promise<NewModel[]> {
        const baseUrl = (provider.apiUrl && provider.apiUrl.trim()) || ModelProviderService.MODELS_LMSTUDIO_URL;

        return this.fetchLocalModels<LMStudioModelPayload>(
            baseUrl.replace(/\/?$/, '') + '/v1/models',
            'LM Studio',
            'models',
            (m) => {
                return {
                    name: m.display_name || m.id || m.key || '',
                    modelId: m.key || m.id,
                    releaseDate: new Date(),
                    lastUpdatedByProvider: new Date(),
                    description: m.description || m.display_name || m.id || m.key,
                    contextWindow: m.max_context_length,
                    reasoning: !!m.capabilities?.reasoning,
                    inputModalities: m.capabilities?.vision
                        ? [ModelModalityEnum.TEXT, ModelModalityEnum.IMAGE]
                        : [ModelModalityEnum.TEXT],
                    outputModalities: [ModelModalityEnum.TEXT],
                    toolCall: !!m.capabilities?.trained_for_tool_use,
                };
            },
        );
    }

    public async getModelsForProviderUsingModelsDotDev(provider: ModelProviderCreateInput): Promise<NewModel[]> {
        const result: NewModel[] = [];
        const catalogEntry = ProviderCatalogByType[provider.type];
        if (!catalogEntry) {
            this.logger.warn(`Model listing is not supported for provider type: ${provider.type}.`);
            return result;
        }

        if (catalogEntry.modelsSource === 'ollama') {
            return this.getModelsFromOllama(provider);
        }

        if (catalogEntry.modelsSource === 'lmstudio') {
            return this.getModelsFromLMStudio(provider);
        }

        if (catalogEntry.modelsSource === 'none') {
            this.logger.warn(`Model listing is not supported for provider type: ${provider.type}.`);
            return result;
        }

        try {
            const response = await fetch(ModelProviderService.MODELS_DOT_DEV_URL, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                this.logger.error('Models.dev API Error:', await response.text());
                return result;
            }

            const data = await response.json();
            const modelsDevKey = catalogEntry.modelsDevKey ?? provider.type;
            const modelsDict = data[modelsDevKey]?.models ?? {};
            for (const key in modelsDict) {
                const m = modelsDict[key];
                result.push({
                    name: key,
                    modelId: key,
                    description: m.name,
                    reasoning: m.reasoning,
                    releaseDate: new Date(m.release_date),
                    lastUpdatedByProvider: new Date(m.last_updated),
                    attachment: m.attachment,
                    toolCall: m.tool_call,
                    inputModalities: m.modalities.input,
                    outputModalities: m.modalities.output,
                    status: m.status ?? ModelStatusEnum.NOT_DEFINED,
                    contextWindow: m.limit?.context ?? ModelProviderService.DEFAULT_CONTEXT_WINDOW,
                    maxOutputWindow: m.limit?.output ?? ModelProviderService.DEFAULT_MAX_OUTPUT_WINDOW,
                });
            }

            result.sort((a, b) => {
                return this.compareProviderUpdateDates(a, b);
            });
        } catch (err) {
            this.logger.error('Models.dev fetch error:', err);
        }

        return result;
    }

    private get logger(): CoreLogger {
        return getCoreLogger();
    }

    private compareProviderUpdateDates(a: NewModel, b: NewModel): number {
        return this.getProviderUpdateTime(b) >= this.getProviderUpdateTime(a) ? 1 : -1;
    }

    private getProviderUpdateTime(model: NewModel): number {
        return model.lastUpdatedByProvider?.getTime() ?? 0;
    }
}
