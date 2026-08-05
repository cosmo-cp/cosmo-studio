import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ModelProviderTypeEnum } from '../database/schema/modelProviderSchema';
import type { ModelProviderCreateInput } from '../dto';
import { setCoreLogger } from '../platform/CoreLogger';
import type { SecretStore } from '../platform/SecretStore';
import type { ModelProviderRepository } from '../repositories/ModelProviderRepository';
import { ModelProviderService } from './ModelProviderService';

const logger = {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
};

const secretStore: SecretStore = {
    isEncryptionAvailable: () => {
        return true;
    },
    encrypt: (value) => {
        return Buffer.from(value, 'utf-8').toString('base64');
    },
    decrypt: vi.fn(() => {
        return 'decrypted-key';
    }),
};

vi.mock('@ai-sdk/anthropic', () => {
    return {
        createAnthropic: vi.fn(() => {
            return 'anthropic-provider';
        }),
    };
});

vi.mock('@ai-sdk/google', () => {
    return {
        createGoogleGenerativeAI: vi.fn(() => {
            return 'google-provider';
        }),
    };
});

vi.mock('@ai-sdk/openai', () => {
    return {
        createOpenAI: vi.fn(() => {
            return 'openai-provider';
        }),
    };
});

vi.mock('ai-sdk-ollama', () => {
    return {
        createOllama: vi.fn(() => {
            return 'ollama-provider';
        }),
    };
});

vi.mock('ai', () => {
    return {
        createProviderRegistry: vi.fn(() => {
            return 'registry';
        }),
    };
});

describe('ModelProviderService', () => {
    let repository: ModelProviderRepository;

    beforeEach(() => {
        setCoreLogger(logger);
        repository = {
            findDuplicates: vi.fn().mockResolvedValue([]),
            addProvider: vi.fn(),
            findProviderById: vi.fn(),
            findAll: vi.fn().mockResolvedValue([]),
            getAllWithModels: vi.fn(),
            deleteProviderById: vi.fn(),
            updateProvider: vi.fn(),
        } as unknown as ModelProviderRepository;
    });

    afterEach(() => {
        vi.clearAllMocks();
        vi.unstubAllGlobals();
    });

    it('rejects duplicate provider entries', async () => {
        repository.findDuplicates = vi.fn().mockResolvedValue([{}]);
        const service = new ModelProviderService(repository, secretStore);

        const provider: ModelProviderCreateInput = {
            name: 'OpenAI',
            apiKey: 'secret',
            type: ModelProviderTypeEnum.OPENAI,
            apiUrl: '',
        };

        await expect(service.addProvider(provider, [])).rejects.toThrow('Duplicate provider entry.');
        expect(repository.addProvider).not.toHaveBeenCalled();
    });

    it('requires provider names when adding providers', async () => {
        const service = new ModelProviderService(repository, secretStore);
        const provider: ModelProviderCreateInput = {
            name: '   ',
            apiKey: 'secret',
            type: ModelProviderTypeEnum.OPENAI,
            apiUrl: '',
        };

        await expect(service.addProvider(provider, [])).rejects.toThrow('Provider name is required.');
        expect(repository.addProvider).not.toHaveBeenCalled();
    });

    it('decrypts api keys when reading providers', async () => {
        const encryptedKey = Buffer.from('secret').toString('base64');
        repository.findAll = vi.fn().mockResolvedValue([
            {
                id: 'provider-id',
                name: 'Provider',
                apiKey: encryptedKey,
                apiUrl: '',
                type: ModelProviderTypeEnum.OPENAI,
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: null,
            },
        ]);
        const service = new ModelProviderService(repository, secretStore);

        const providers = await service.getProviders({ withApiKey: true });

        expect(providers[0].apiKey).toBe('decrypted-key');
        expect(providers[0].createdAt).toBeInstanceOf(Date);
    });

    it('skips custom providers when listing models', async () => {
        const service = new ModelProviderService(repository, secretStore);
        const provider: ModelProviderCreateInput = {
            name: 'Custom',
            apiKey: '',
            type: ModelProviderTypeEnum.CUSTOM,
            apiUrl: 'https://custom.example',
        };

        const result = await service.getModelsForProviderUsingModelsDotDev(provider);

        expect(result).toEqual([]);
        expect(logger.warn).toHaveBeenCalledWith('Model listing is not supported for provider type: custom.');
    });

    it('maps models.dev responses for remote providers', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => {
                return {
                    openai: {
                        models: {
                            'gpt-4': {
                                name: 'GPT-4',
                                reasoning: true,
                                release_date: '2024-01-01',
                                last_updated: '2024-02-01',
                                attachment: true,
                                tool_call: true,
                                modalities: {
                                    input: ['text'],
                                    output: ['text'],
                                },
                            },
                        },
                    },
                };
            },
        });
        vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);
        const service = new ModelProviderService(repository, secretStore);

        const provider: ModelProviderCreateInput = {
            name: 'OpenAI',
            apiKey: '',
            type: ModelProviderTypeEnum.OPENAI,
            apiUrl: '',
        };

        const result = await service.getModelsForProviderUsingModelsDotDev(provider);

        expect(result).toHaveLength(1);
        expect(result[0].modelId).toBe('gpt-4');
        expect(result[0].reasoning).toBe(true);
        expect(result[0].inputModalities).toEqual(['text']);
    });

    it('rethrows provider deletion failures so renderer can surface errors', async () => {
        const service = new ModelProviderService(repository, secretStore);
        const error = new Error('delete failed');
        repository.deleteProviderById = vi.fn().mockRejectedValue(error);

        await expect(service.deleteProvider('provider-id')).rejects.toThrow('delete failed');
        expect(logger.error).toHaveBeenCalledWith('Failed to delete provider', error);
    });
});
