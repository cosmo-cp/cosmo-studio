'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ProviderIcon from '@/components/provider-icon';
import { ProviderInfo } from '@/lib/types';
import { NewModel, ProviderWithModels } from 'core/dto';
import { ModelProviderTypeEnum } from 'core/database/schema/modelProviderSchema';
import { ProviderCatalog } from 'core/providerCatalog';
import { useTheme } from 'next-themes';
import { ArrowDownToLine, ArrowUpFromLine, Brain, Edit, Trash2, Wrench } from 'lucide-react';
import { defineStepper } from '@stepperize/react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader } from '@/components/ai-elements/loader';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { logger } from '../../logger';

export function ProviderManagement() {
    const { resolvedTheme } = useTheme();
    const [providers, setProviders] = useState<ProviderWithModels[]>([]);
    const [models, setModels] = useState<NewModel[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isLoadingModels, setIsLoadingModels] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; providerId: string | null }>({
        isOpen: false,
        providerId: null,
    });

    // Form state
    const [selectedProviderType, setSelectedProviderType] = useState<ModelProviderTypeEnum | null>(null);
    const [name, setName] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [apiUrl, setApiUrl] = useState('');
    const [editingProvider, setEditingProvider] = useState<ProviderWithModels | null>(null);
    const [selectedModels, setSelectedModels] = useState<NewModel[]>([]);
    const [providerSearch, setProviderSearch] = useState('');

    // Providers that don't require an API key
    const LOCAL_PROVIDERS = [ModelProviderTypeEnum.OLLAMA, ModelProviderTypeEnum.LMSTUDIO];
    const isLocalProvider = selectedProviderType !== null && LOCAL_PROVIDERS.includes(selectedProviderType);

    const { useStepper } = defineStepper(
        { id: 'step-1', title: 'Select Provider' },
        { id: 'step-2', title: 'Enter Info' },
        { id: 'step-3', title: 'Select Models' },
    );

    const methods = useStepper();

    // Load providers on mount
    useEffect(() => {
        async function loadProviders() {
            try {
                const list = await window.api.modelProvider.getProvidersWithModels();
                setProviders(list);
            } catch (e) {
                logger.error('Failed to load providers', e);
                setError('Failed to load providers');
            } finally {
                setLoading(false);
            }
        }

        loadProviders();
    }, []);

    const handleOpenDialog = () => {
        setEditingProvider(null);
        setSelectedProviderType(null);
        setName('');
        setApiKey('');
        setApiUrl('');
        setSelectedModels([]);
        setIsOpen(true);
        setError(null);
        setProviderSearch('');
        methods.goTo('step-1');
    };

    const handleCloseDialog = () => {
        setIsOpen(false);
    };

    const handleDialogOpenChange = (open: boolean) => {
        if (!open) {
            handleCloseDialog();
            return;
        }
        setIsOpen(true);
    };

    const getErrorMessage = (error: unknown): string => {
        if (error instanceof Error) {
            return error.message;
        }
        return 'Unexpected error';
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
                // Validate URL format before hitting IPC/database.
                new URL(trimmedApiUrl);
            } catch {
                return 'API URL must be a valid URL.';
            }
        }

        return null;
    };

    const handleProviderTypeChange = (type: ModelProviderTypeEnum) => {
        setSelectedProviderType(type);
        const info = ProviderInfo[type];
        setName(info.name);
        methods.next();
    };

    const loadModelsForSelectedProvider = async () => {
        if (!selectedProviderType) {
            return;
        }
        setIsLoadingModels(true);
        setError(null);
        setModels([]);
        try {
            const values = await window.api.modelProvider.getAvailableModelsFromProviders({
                type: selectedProviderType,
                apiKey,
                apiUrl,
                name,
            });
            setModels(values);
            if (values.length === 0) {
                setError('No models found for this provider.');
            }
        } catch (error) {
            logger.error(error);
            setError('Failed to load models for this provider.');
        } finally {
            setIsLoadingModels(false);
        }
    };

    const handleAddProvider = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProviderType || isSubmitting) return;

        const validationError = validateProviderForm();
        if (validationError) {
            setError(validationError);
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const isCustomProvider = selectedProviderType === ModelProviderTypeEnum.CUSTOM;
            const providerData = {
                type: selectedProviderType,
                name: name.trim(),
                apiKey: apiKey.trim(),
                apiUrl: apiUrl.trim() || (isCustomProvider ? '' : undefined),
            };

            if (editingProvider) {
                // Update existing provider
                const updatedProvider = await window.api.modelProvider.updateProvider(
                    editingProvider.id,
                    providerData,
                    selectedModels,
                );
                if (updatedProvider) {
                    setProviders((prev) => prev.map((p) => (p.id === editingProvider.id ? updatedProvider : p)));
                    handleCloseDialog();
                }
            } else {
                const newProvider = await window.api.modelProvider.addProvider(providerData, selectedModels);
                if (newProvider) {
                    setProviders((prev) => [...prev, newProvider]);
                    handleCloseDialog();
                }
            }
        } catch (err) {
            const errorMessage = getErrorMessage(err);
            logger.error(`Failed to ${editingProvider ? 'update' : 'add'} provider:`, err);
            setError(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditProvider = (provider: ProviderWithModels) => {
        setEditingProvider(provider);
        setSelectedProviderType(provider.type);
        setName(provider.name ?? '');
        setApiKey(provider.apiKey ?? '');
        setApiUrl(provider.apiUrl ?? '');
        setSelectedModels(provider.models ?? []);
        setIsOpen(true);
        setError(null);
        methods.goTo('step-2');
    };

    const handleDeleteClick = (providerId: string) => {
        setDeleteConfirmation({ isOpen: true, providerId });
    };

    const handleConfirmDelete = async () => {
        if (!deleteConfirmation.providerId) return;
        const providerId = deleteConfirmation.providerId;

        setIsDeleting(providerId);
        setDeleteConfirmation({ isOpen: false, providerId: null });

        try {
            await window.api.modelProvider.deleteProvider(providerId);
            setProviders((prev) => prev.filter((p) => p.id !== providerId));
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to delete provider';
            logger.error('Failed to delete provider:', err);
            setError(errorMessage);
        } finally {
            setIsDeleting(null);
        }
    };

    const handleModelToggle = (modelId: string) => {
        setSelectedModels((prev) => {
            const modelIdSet = new Set(prev.map((m) => m.modelId));
            if (modelIdSet.has(modelId)) {
                return prev.filter((m) => m.modelId !== modelId);
            }
            const modelToAdd = models.find((m) => m.modelId === modelId);
            if (!modelToAdd) {
                return prev;
            }
            return [...prev, modelToAdd];
        });
    };

    const filteredProviders = ProviderCatalog.filter((provider) => {
        if (!providerSearch.trim()) {
            return true;
        }
        const query = providerSearch.trim().toLowerCase();
        return provider.name.toLowerCase().includes(query) || provider.type.toLowerCase().includes(query);
    });

    const capabilityClassName = (isPresent: boolean) => (isPresent ? 'text-green-600' : 'text-red-600');

    const formatModality = (modality: string) =>
        modality.toUpperCase() === 'PDF' ? 'PDF' : modality.charAt(0).toUpperCase() + modality.slice(1);

    const renderCapabilityIcon = ({
        label,
        isPresent,
        icon,
    }: {
        label: string;
        isPresent: boolean;
        icon: React.ReactNode;
    }) => (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    aria-label={`${label}: ${isPresent ? 'present' : 'absent'}`}
                    className={`${capabilityClassName(isPresent)} inline-flex items-center rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring`}
                >
                    {icon}
                </button>
            </TooltipTrigger>
            <TooltipContent>
                <p>{label}</p>
            </TooltipContent>
        </Tooltip>
    );

    if (loading) {
        return <div className="text-sm text-muted-foreground">Loading providers...</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-medium">Providers</h2>
                    <p className="text-xs text-muted-foreground mt-1">
                        Manage your AI provider configurations and API keys.
                    </p>
                </div>
                <Button onClick={handleOpenDialog} className="ml-auto">
                    Add Provider
                </Button>
            </div>

            {providers.length > 0 ? (
                <ScrollArea type="always" className="h-[50dvh]">
                    <div className="space-y-3">
                        {providers.map((provider) => (
                            <Card key={provider.id} className="p-4 justify-between flex-row">
                                <div className="flex items-center gap-3">
                                    <ProviderIcon type={provider.type} theme={resolvedTheme} size={40} />
                                    <div className="flex-1">
                                        <p className="font-medium text-sm">{provider.name}</p>
                                        <p className="text-xs text-muted-foreground capitalize">{provider.type}</p>
                                        {provider.models && provider.models.length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-1">
                                                {provider.models.map((model) => (
                                                    <span
                                                        key={model.modelId}
                                                        className="inline-block px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded"
                                                    >
                                                        {model.name}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        onClick={() => handleEditProvider(provider)}
                                        aria-label="Edit provider"
                                        title="Edit provider"
                                    >
                                        <Edit className="size-4" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        onClick={() => handleDeleteClick(provider.id)}
                                        disabled={isDeleting === provider.id}
                                        aria-label="Delete provider"
                                        title="Delete provider"
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                    >
                                        <Trash2 className="size-4" />
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                </ScrollArea>
            ) : (
                <Card className="p-6 text-center">
                    <p className="text-sm text-muted-foreground">No providers added yet.</p>
                </Card>
            )}

            <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
                <DialogContent className="sm:max-w-[720px] max-h-[85dvh] p-6 overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle>{editingProvider ? 'Edit Provider' : 'Add Provider'}</DialogTitle>
                    </DialogHeader>
                    <div className="py-2">
                        {methods.when('step-1', () => (
                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm text-muted-foreground mb-2">Select a provider type:</p>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium" htmlFor="provider-search">
                                            Search
                                        </label>
                                        <input
                                            id="provider-search"
                                            type="text"
                                            placeholder="Search providers"
                                            value={providerSearch}
                                            onChange={(e) => setProviderSearch(e.target.value)}
                                            className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                                        />
                                    </div>
                                </div>
                                <ScrollArea type="always" className="h-[50dvh] rounded-md border w-full">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2">
                                        {filteredProviders.map((providerType) => {
                                            const info = ProviderInfo[providerType.type];
                                            return (
                                                <button
                                                    key={providerType.type}
                                                    type="button"
                                                    onClick={() => handleProviderTypeChange(providerType.type)}
                                                    className={`w-full flex items-center gap-3 p-3 border rounded-lg transition-colors text-left ${selectedProviderType === providerType.type ? 'bg-secondary text-secondary-foreground' : 'hover:bg-accent'}`}
                                                >
                                                    <ProviderIcon
                                                        type={providerType.type}
                                                        theme={resolvedTheme}
                                                        size={40}
                                                    />
                                                    <div>
                                                        <p className="text-sm font-medium">{info.name}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {info.description}
                                                        </p>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                        {filteredProviders.length === 0 && (
                                            <div className="col-span-full text-sm text-muted-foreground px-2 py-4 text-center">
                                                No providers match your search.
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </div>
                        ))}
                        {selectedProviderType &&
                            methods.when('step-2', () => (
                                <div className="space-y-4 pr-2 max-h-[60dvh] overflow-y-auto">
                                    <div className="flex items-center gap-2 pb-2 border-b">
                                        <ProviderIcon type={selectedProviderType} theme={resolvedTheme} size={32} />
                                        <div>
                                            <p className="text-sm font-medium">
                                                {ProviderInfo[selectedProviderType].name}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Name(Unique)</label>
                                        <input
                                            type="text"
                                            placeholder="Display name (e.g., My OpenAI Account)"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                                        />
                                    </div>

                                    {!isLocalProvider && (
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">API Key *</label>
                                            <input
                                                type="password"
                                                placeholder="Enter your API key"
                                                value={apiKey}
                                                onChange={(e) => setApiKey(e.target.value)}
                                                required
                                                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                                            />
                                        </div>
                                    )}

                                    {selectedProviderType === ModelProviderTypeEnum.CUSTOM && (
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">API URL *</label>
                                            <input
                                                type="url"
                                                placeholder="https://api.example.com/v1"
                                                value={apiUrl}
                                                onChange={(e) => setApiUrl(e.target.value)}
                                                required={selectedProviderType === ModelProviderTypeEnum.CUSTOM}
                                                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                                            />
                                        </div>
                                    )}

                                    {selectedProviderType !== ModelProviderTypeEnum.CUSTOM && (
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">API URL (optional)</label>
                                            <input
                                                type="url"
                                                placeholder="Leave blank for default"
                                                value={apiUrl}
                                                onChange={(e) => setApiUrl(e.target.value)}
                                                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}
                        {methods.when('step-3', () => (
                            //iterate over the models
                            <div className="space-y-4">
                                <ScrollArea type="always" className="h-[50dvh] rounded-md border w-full">
                                    {isLoadingModels ? (
                                        <Loader />
                                    ) : models.length === 0 ? (
                                        <div className="p-3 text-sm text-muted-foreground">No models available.</div>
                                    ) : (
                                        models.map((model) => (
                                            <div
                                                key={model.modelId}
                                                className="flex items-start justify-between gap-3 p-2"
                                            >
                                                <div className="flex items-center space-x-2 min-w-0">
                                                    <input
                                                        type="checkbox"
                                                        id={model.modelId}
                                                        name={model.modelId}
                                                        checked={selectedModels.some(
                                                            (m) => m.modelId === model.modelId,
                                                        )}
                                                        onChange={() => handleModelToggle(model.modelId)}
                                                    />
                                                    <label
                                                        htmlFor={model.modelId}
                                                        className="text-sm font-medium cursor-pointer truncate"
                                                    >
                                                        {model.name}
                                                    </label>
                                                </div>
                                                <div className="flex flex-col items-end gap-1 shrink-0">
                                                    <div className="flex items-center gap-2">
                                                        {renderCapabilityIcon({
                                                            label: 'Tool call',
                                                            isPresent: Boolean(model.toolCall),
                                                            icon: <Wrench className="size-4" aria-hidden="true" />,
                                                        })}
                                                        {renderCapabilityIcon({
                                                            label: 'Reasoning',
                                                            isPresent: Boolean(model.reasoning),
                                                            icon: <Brain className="size-4" aria-hidden="true" />,
                                                        })}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <span
                                                            className={`inline-flex items-center gap-1 ${capabilityClassName(model.inputModalities.length > 0)}`}
                                                        >
                                                            <ArrowDownToLine className="size-3.5" aria-hidden="true" />
                                                            {model.inputModalities.length > 0
                                                                ? model.inputModalities.map(formatModality).join(', ')
                                                                : 'None'}
                                                        </span>
                                                        <span
                                                            className={`inline-flex items-center gap-1 ${capabilityClassName(model.outputModalities.length > 0)}`}
                                                        >
                                                            <ArrowUpFromLine className="size-3.5" aria-hidden="true" />
                                                            {model.outputModalities.length > 0
                                                                ? model.outputModalities.map(formatModality).join(', ')
                                                                : 'None'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </ScrollArea>
                            </div>
                        ))}
                    </div>
                    <div className="mt-2 space-y-4">
                        {error && (
                            <div className="p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-600">
                                {error}
                            </div>
                        )}
                        <DialogFooter>
                            {!methods.isFirst && (
                                <Button type="button" variant="outline" onClick={() => methods.prev()}>
                                    Prev
                                </Button>
                            )}
                            {!methods.isLast && !(selectedProviderType === ModelProviderTypeEnum.CUSTOM) && (
                                <Button
                                    type="button"
                                    disabled={methods.current.id === 'step-1' && !selectedProviderType}
                                    onClick={() => {
                                        if (methods.current.id === 'step-2') {
                                            void loadModelsForSelectedProvider();
                                        }
                                        methods.next();
                                    }}
                                >
                                    Next
                                </Button>
                            )}
                            {(methods.isLast ||
                                (methods.current.id === 'step-2' &&
                                    selectedProviderType === ModelProviderTypeEnum.CUSTOM)) && (
                                <Button type="button" onClick={handleAddProvider}>
                                    Save
                                </Button>
                            )}
                            <Button type="button" variant="outline" onClick={handleCloseDialog}>
                                Cancel
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>
            <ConfirmDialog
                open={deleteConfirmation.isOpen}
                onOpenChange={(open) => setDeleteConfirmation((prev) => ({ ...prev, isOpen: open }))}
                title="Delete Provider"
                description="Are you sure you want to delete this provider? This action cannot be undone."
                confirmText="Delete"
                variant="destructive"
                onConfirm={handleConfirmDelete}
            />
        </div>
    );
}
