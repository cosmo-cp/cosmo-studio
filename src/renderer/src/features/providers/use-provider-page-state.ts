'use client';

import {
    useDeleteProviderMutation,
    useGetAvailableModelsForProviderMutation,
    useGetProvidersQuery,
    useSaveProviderMutation,
} from '@/features/providers/providers-api';
import { defineStepper } from '@stepperize/react';
import { ModelProviderTypeEnum } from 'core/database/schema/modelProviderSchema';
import type { NewModel, ProviderWithModels } from 'core/dto';
import { ProviderCatalog } from 'core/providerCatalog';
import { useState, type FormEvent } from 'react';

function getBackendErrorMessage(error: unknown): string {
    if (typeof error === 'string' && error.trim().length > 0) {
        return error;
    }

    if (error instanceof Error && error.message.trim().length > 0) {
        return error.message;
    }

    return 'Unexpected error';
}

const LOCAL_PROVIDERS = [ModelProviderTypeEnum.OLLAMA, ModelProviderTypeEnum.LMSTUDIO];

export function useProviderPageState() {
    const { data: providers = [], isLoading: isLoadingProviders, error: providersError } = useGetProvidersQuery();
    const [loadAvailableModelsForProvider] = useGetAvailableModelsForProviderMutation();
    const [saveProvider] = useSaveProviderMutation();
    const [deleteProvider] = useDeleteProviderMutation();
    const [models, setModels] = useState<NewModel[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoadingModels, setIsLoadingModels] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; providerId: string | null }>({
        isOpen: false,
        providerId: null,
    });
    const [selectedProviderType, setSelectedProviderType] = useState<ModelProviderTypeEnum | null>(null);
    const [name, setName] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [apiUrl, setApiUrl] = useState('');
    const [editingProvider, setEditingProvider] = useState<ProviderWithModels | null>(null);
    const [selectedModels, setSelectedModels] = useState<NewModel[]>([]);
    const [providerSearch, setProviderSearch] = useState('');

    const { useStepper } = defineStepper([
        { id: 'step-1', title: 'Select Provider' },
        { id: 'step-2', title: 'Enter Info' },
        { id: 'step-3', title: 'Select Models' },
    ]);
    const stepper = useStepper();

    const isLocalProvider = selectedProviderType !== null && LOCAL_PROVIDERS.includes(selectedProviderType);

    const openCreateDialog = () => {
        setEditingProvider(null);
        setSelectedProviderType(null);
        setName('');
        setApiKey('');
        setApiUrl('');
        setSelectedModels([]);
        setModels([]);
        setIsOpen(true);
        setError(null);
        setProviderSearch('');
        stepper.goTo('step-1');
    };

    const closeDialog = () => {
        setIsOpen(false);
        setModels([]);
    };

    const handleDialogOpenChange = (open: boolean) => {
        if (!open) {
            closeDialog();
            return;
        }

        setIsOpen(true);
    };

    const validateProviderForm = () => {
        const trimmedName = name.trim();
        const trimmedApiKey = apiKey.trim();
        const trimmedApiUrl = apiUrl.trim();

        if (!trimmedName) {
            return 'Name is required.';
        }
        if (!isLocalProvider && !trimmedApiKey) {
            return 'API key is required.';
        }
        if (selectedProviderType === ModelProviderTypeEnum.CUSTOM && !trimmedApiUrl) {
            return 'API URL is required for custom providers.';
        }

        if (trimmedApiUrl) {
            try {
                new URL(trimmedApiUrl);
            } catch {
                return 'API URL must be a valid URL.';
            }
        }

        return null;
    };

    const changeProviderType = (type: ModelProviderTypeEnum) => {
        if (type !== selectedProviderType || !editingProvider) {
            setApiKey('');
            setApiUrl('');
            setSelectedModels([]);
            setModels([]);
            setError(null);
        }

        setSelectedProviderType(type);
        setName(ProviderCatalog.find((provider) => provider.type === type)?.name ?? '');
        stepper.next();
    };

    const loadModels = async () => {
        if (!selectedProviderType) {
            return;
        }

        const currentType = selectedProviderType;
        setIsLoadingModels(true);
        setError(null);
        setModels([]);

        const result = await loadAvailableModelsForProvider({
            type: selectedProviderType,
            apiKey,
            apiUrl,
            name,
        });

        if (currentType === selectedProviderType) {
            if ('data' in result) {
                const availableModels = result.data ?? [];
                setModels(availableModels);
                if (availableModels.length === 0) {
                    setError('No models found for this provider.');
                }
            } else {
                setError(getBackendErrorMessage(result.error));
            }

            setIsLoadingModels(false);
        }
    };

    const saveProviderDraft = async (event: FormEvent) => {
        event.preventDefault();
        if (!selectedProviderType || isSubmitting) {
            return;
        }

        const validationError = validateProviderForm();
        if (validationError) {
            setError(validationError);
            return;
        }

        setIsSubmitting(true);
        setError(null);

        const isCustomProvider = selectedProviderType === ModelProviderTypeEnum.CUSTOM;
        const providerData = {
            type: selectedProviderType,
            name: name.trim(),
            apiKey: apiKey.trim(),
            apiUrl: apiUrl.trim() || (isCustomProvider ? '' : undefined),
        } as const;

        const result = await saveProvider(
            editingProvider
                ? {
                      providerId: editingProvider.id,
                      providerData,
                      models: selectedModels,
                  }
                : {
                      providerData,
                      models: selectedModels,
                  },
        );

        if ('error' in result) {
            setError(getBackendErrorMessage(result.error));
            setIsSubmitting(false);
            return;
        }

        closeDialog();
        setIsSubmitting(false);
    };

    const editProvider = (provider: ProviderWithModels) => {
        setEditingProvider(provider);
        setSelectedProviderType(provider.type);
        setName(provider.name ?? '');
        setApiKey(provider.apiKey ?? '');
        setApiUrl(provider.apiUrl ?? '');
        setSelectedModels(provider.models ?? []);
        setIsOpen(true);
        setError(null);
        stepper.goTo('step-2');
    };

    const requestDeleteProvider = (providerId: string) => {
        setDeleteConfirmation({ isOpen: true, providerId });
    };

    const clearDeleteConfirmation = () => {
        setDeleteConfirmation({ isOpen: false, providerId: null });
    };

    const confirmDeleteProvider = async () => {
        if (!deleteConfirmation.providerId) {
            return;
        }

        const providerId = deleteConfirmation.providerId;
        setIsDeleting(providerId);
        clearDeleteConfirmation();

        const result = await deleteProvider(providerId);
        if ('error' in result) {
            setError(getBackendErrorMessage(result.error));
        }

        setIsDeleting(null);
    };

    const toggleModel = (modelId: string) => {
        setSelectedModels((currentModels) => {
            const selectedModelIds = new Set(currentModels.map((model) => model.modelId));
            if (selectedModelIds.has(modelId)) {
                return currentModels.filter((model) => model.modelId !== modelId);
            }

            const modelToAdd = models.find((model) => model.modelId === modelId);
            if (!modelToAdd) {
                return currentModels;
            }

            return [...currentModels, modelToAdd];
        });
    };

    const filteredProviders = ProviderCatalog.filter((provider) => {
        if (!providerSearch.trim()) {
            return true;
        }

        const query = providerSearch.trim().toLowerCase();
        return provider.name.toLowerCase().includes(query) || provider.type.toLowerCase().includes(query);
    });

    return {
        providers,
        isLoadingProviders,
        providersError,
        models,
        isOpen,
        isSubmitting,
        error,
        isLoadingModels,
        isDeleting,
        deleteConfirmation,
        selectedProviderType,
        name,
        apiKey,
        apiUrl,
        editingProvider,
        selectedModels,
        providerSearch,
        filteredProviders,
        isLocalProvider,
        stepper,
        setName,
        setApiKey,
        setApiUrl,
        setProviderSearch,
        handleDialogOpenChange,
        openCreateDialog,
        closeDialog,
        changeProviderType,
        loadModels,
        saveProviderDraft,
        editProvider,
        requestDeleteProvider,
        clearDeleteConfirmation,
        confirmDeleteProvider,
        toggleModel,
    };
}
