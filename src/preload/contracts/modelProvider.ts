import type {
    ModelProviderCreateInput,
    ModelProviderLite,
    NewModel,
    ProviderWithModels,
    PublicProviderRegistryV1,
} from '../../../packages/core/dto';

export interface ModelProviderApi {
    addProvider(providerData: ModelProviderCreateInput, models: NewModel[]): Promise<ProviderWithModels>;
    getProviderForId(providerId: string): Promise<ProviderWithModels | undefined>;
    getProviders(): Promise<ModelProviderLite[]>;
    getProvidersWithModels(): Promise<ProviderWithModels[]>;
    getProviderRegistry(): Promise<PublicProviderRegistryV1>;
    deleteProvider(providerId: string): Promise<void>;
    updateProvider(
        providerId: string,
        updateObject: Partial<ModelProviderCreateInput>,
        modelsData: NewModel[],
    ): Promise<ProviderWithModels>;
    getAvailableModelsFromProviders(provider: ModelProviderCreateInput): Promise<NewModel[]>;
}
