'use client';

import { Loader } from '@/components/ai-elements/loader';
import { ConfirmDialog } from '@/components/confirm-dialog';
import ProviderIcon from '@/components/provider-icon';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useProviderPageState } from '@/features/providers/use-provider-page-state';
import { ModelProviderTypeEnum } from 'core/database/schema/modelProviderSchema';
import { ProviderCatalogByType } from 'core/providerCatalog';
import { ArrowDownToLine, ArrowUpFromLine, Brain, Edit, Trash2, Wrench } from 'lucide-react';
import { useTheme } from 'next-themes';
import React from 'react';

export const ProviderInfo: Record<ModelProviderTypeEnum, { name: string; description: string }> = Object.values(
    ProviderCatalogByType,
).reduce(
    (acc, entry) => {
        acc[entry.type] = { name: entry.name, description: entry.description };
        return acc;
    },
    {} as Record<ModelProviderTypeEnum, { name: string; description: string }>,
);

export function ProviderManagement() {
    const { resolvedTheme } = useTheme();
    const {
        providers,
        isLoadingProviders,
        providersError,
        models,
        isOpen,
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
    } = useProviderPageState();

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

    if (isLoadingProviders && providers.length === 0) {
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
                <Button onClick={openCreateDialog} className="ml-auto">
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
                                        onClick={() => editProvider(provider)}
                                        aria-label="Edit provider"
                                        title="Edit provider"
                                    >
                                        <Edit className="size-4" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        onClick={() => requestDeleteProvider(provider.id)}
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
                        {stepper.is('step-1') && (
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
                                                    onClick={() => changeProviderType(providerType.type)}
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
                        )}
                        {selectedProviderType && stepper.is('step-2') && (
                            <div className="space-y-4 pr-2 max-h-[60dvh] overflow-y-auto">
                                <div className="flex items-center gap-2 pb-2 border-b">
                                    <ProviderIcon type={selectedProviderType} theme={resolvedTheme} size={32} />
                                    <div>
                                        <p className="text-sm font-medium">{ProviderInfo[selectedProviderType].name}</p>
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
                        )}
                        {stepper.is('step-3') && (
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
                                                        onChange={() => toggleModel(model.modelId)}
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
                        )}
                    </div>
                    <div className="mt-2 space-y-4">
                        {(error ?? (providersError ? providersError : null)) && (
                            <div className="p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-600">
                                {error ?? providersError ?? 'Failed to load providers'}
                            </div>
                        )}
                        <DialogFooter>
                            {!stepper.isFirst && (
                                <Button type="button" variant="outline" onClick={() => stepper.prev()}>
                                    Prev
                                </Button>
                            )}
                            {!stepper.isLast && !(selectedProviderType === ModelProviderTypeEnum.CUSTOM) && (
                                <Button
                                    type="button"
                                    disabled={stepper.current.id === 'step-1' && !selectedProviderType}
                                    onClick={() => {
                                        if (stepper.current.id === 'step-2') {
                                            void loadModels();
                                        }
                                        stepper.next();
                                    }}
                                >
                                    Next
                                </Button>
                            )}
                            {(stepper.isLast ||
                                (stepper.current.id === 'step-2' &&
                                    selectedProviderType === ModelProviderTypeEnum.CUSTOM)) && (
                                <Button type="button" onClick={(event) => void saveProviderDraft(event)}>
                                    Save
                                </Button>
                            )}
                            <Button type="button" variant="outline" onClick={closeDialog}>
                                Cancel
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>
            <ConfirmDialog
                open={deleteConfirmation.isOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        clearDeleteConfirmation();
                    }
                }}
                title="Delete Provider"
                description="Are you sure you want to delete this provider? This action cannot be undone."
                confirmText="Delete"
                variant="destructive"
                onConfirm={confirmDeleteProvider}
            />
        </div>
    );
}
