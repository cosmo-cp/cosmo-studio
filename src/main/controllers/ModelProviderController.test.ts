import { ModelProviderTypeEnum } from 'core/database/schema/modelProviderSchema';
import type { ModelProviderCreateInput, ProviderWithModels } from 'core/dto';
import type { ModelProviderService } from 'core/services/ModelProviderService';
import { describe, expect, it, vi } from 'vitest';
import { ModelProviderController } from './ModelProviderController';

describe('ModelProviderController', () => {
    it('delegates provider creation to the service', async () => {
        const service = {
            addProvider: vi.fn().mockResolvedValue({ id: 'provider-id' } as ProviderWithModels),
        } as unknown as ModelProviderService;
        const controller = new ModelProviderController(service);
        const provider: ModelProviderCreateInput = {
            name: 'OpenAI',
            apiKey: 'secret',
            type: ModelProviderTypeEnum.OPENAI,
            apiUrl: '',
        };

        const result = await controller.addProvider(provider, []);

        expect(service.addProvider).toHaveBeenCalledWith(provider, []);
        expect(result.id).toBe('provider-id');
    });

    it('delegates provider retrieval methods', async () => {
        const service = {
            getProviderForId: vi.fn().mockResolvedValue(undefined),
            getProviders: vi.fn().mockResolvedValue([]),
            getProvidersWithModels: vi.fn().mockResolvedValue([]),
        } as unknown as ModelProviderService;
        const controller = new ModelProviderController(service);

        await controller.getProviderForId('provider-id');
        expect(service.getProviderForId).toHaveBeenCalledWith('provider-id');

        await controller.getProviders();
        expect(service.getProviders).toHaveBeenCalledWith({ withApiKey: false });

        await controller.getProvidersWithModels();
        expect(service.getProvidersWithModels).toHaveBeenCalledTimes(1);
    });

    it('delegates deletes, updates, and model listing', async () => {
        const service = {
            deleteProvider: vi.fn().mockResolvedValue(undefined),
            updateProvider: vi.fn().mockResolvedValue({ id: 'provider-id' } as ProviderWithModels),
            getModelsForProviderUsingModelsDotDev: vi.fn().mockResolvedValue([]),
        } as unknown as ModelProviderService;
        const controller = new ModelProviderController(service);

        await controller.deleteProvider('provider-id');
        expect(service.deleteProvider).toHaveBeenCalledWith('provider-id');

        await controller.updateProvider('provider-id', { name: 'Updated' } as ModelProviderCreateInput, []);
        expect(service.updateProvider).toHaveBeenCalledWith('provider-id', { name: 'Updated' }, []);

        const provider: ModelProviderCreateInput = {
            name: 'OpenAI',
            apiKey: 'secret',
            type: ModelProviderTypeEnum.OPENAI,
            apiUrl: '',
        };
        await controller.getAvailableModelsFromProviders(provider);
        expect(service.getModelsForProviderUsingModelsDotDev).toHaveBeenCalledWith(provider);
    });
});
