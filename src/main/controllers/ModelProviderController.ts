import { inject, injectable } from 'inversify';
import { z } from 'zod';
import { IpcController, IpcHandler } from '../ipc/Decorators';
import type { ModelProviderCreateInput, ModelProviderLite, NewModel, ProviderWithModels } from 'core/dto';
import { CORETYPES } from 'core/types/types';
import { ModelProviderService } from 'core/services/ModelProviderService';
import { Controller } from './Controller';

const modelProviderCreateInputSchema = z.custom<ModelProviderCreateInput>();
const newModelsSchema = z.array(z.custom<NewModel>());
const modelProviderUpdateSchema = z.custom<Partial<ModelProviderCreateInput>>();

@injectable()
@IpcController('modelProvider')
export class ModelProviderController implements Controller {
    constructor(
        @inject(CORETYPES.ModelProviderService)
        private modelProviderService: ModelProviderService,
    ) {}

    @IpcHandler('addProvider', z.tuple([modelProviderCreateInputSchema, newModelsSchema]))
    public async addProvider(providerData: ModelProviderCreateInput, models: NewModel[]): Promise<ProviderWithModels> {
        return this.modelProviderService.addProvider(providerData, models);
    }

    @IpcHandler('getProviderForId', z.tuple([z.string().min(1)]))
    public async getProviderForId(providerId: string): Promise<ProviderWithModels | undefined> {
        return this.modelProviderService.getProviderForId(providerId);
    }

    @IpcHandler('getProviders', z.tuple([]))
    public async getProviders(): Promise<ModelProviderLite[]> {
        return this.modelProviderService.getProviders({ withApiKey: false });
    }

    @IpcHandler('getProvidersWithModels', z.tuple([]))
    public async getProvidersWithModels(): Promise<ProviderWithModels[]> {
        return this.modelProviderService.getProvidersWithModels();
    }

    @IpcHandler('deleteProvider', z.tuple([z.string().min(1)]))
    public async deleteProvider(providerId: string): Promise<void> {
        return this.modelProviderService.deleteProvider(providerId);
    }

    @IpcHandler('updateProvider', z.tuple([z.string().min(1), modelProviderUpdateSchema, newModelsSchema]))
    public async updateProvider(
        providerId: string,
        updateObject: Partial<ModelProviderCreateInput>,
        modelsData: NewModel[],
    ): Promise<ProviderWithModels> {
        return this.modelProviderService.updateProvider(providerId, updateObject, modelsData);
    }

    @IpcHandler('getAvailableModelsFromProviders', z.tuple([modelProviderCreateInputSchema]))
    public async getAvailableModelsFromProviders(provider: ModelProviderCreateInput): Promise<NewModel[]> {
        return this.modelProviderService.getModelsForProviderUsingModelsDotDev(provider);
    }
}
