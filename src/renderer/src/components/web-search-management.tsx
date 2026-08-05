'use client';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import {
    deleteParallelWebSearchConfig,
    deleteWebSearchConfig,
    loadWebSearchConfig,
    loadWebSearchOptions,
    saveParallelWebSearchConfig,
    saveWebSearchConfig,
} from '@/lib/store/web-search-store';
import { PARALLEL_WEB_SEARCH_PROVIDER_ID, type FrontendWebSearchProviderConfig } from '@/lib/web-search-options';
import { WebSearchProviderTypeEnum } from 'core/database/schema/webSearchConfigSchema';
import type { LucideIcon } from 'lucide-react';
import { ExternalLink, Globe, KeyRound, Search, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';

type WebSearchProviderId = WebSearchProviderTypeEnum.EXA | typeof PARALLEL_WEB_SEARCH_PROVIDER_ID;

interface WebSearchProviderDefinition {
    id: WebSearchProviderId;
    name: string;
    title: string;
    description: string;
    docsUrl: string;
    apiKeyUrl: string;
    defaults: Array<{ label: string; value: string }>;
    dialogDescription: string;
    emptyRuntimeDescription: string;
    enabledRuntimeDescription: string;
    disabledRuntimeDescription: string;
    emptyApiKeyPlaceholder: string;
    savedApiKeyPlaceholder: string;
    emptyApiKeyHelperText: string;
    savedApiKeyHelperText: string;
    removeDescription: string;
    storageBadge: string;
    addLabel: string;
    editLabel: string;
    saveLabel: string;
    icon: LucideIcon;
}

const providerDefinitions: WebSearchProviderDefinition[] = [
    {
        id: WebSearchProviderTypeEnum.EXA,
        name: 'Exa',
        title: 'Exa web search',
        description: 'Adds live web search to the chat tool set when you need fresh results.',
        docsUrl: 'https://ai-sdk.dev/tools-registry/exa',
        apiKeyUrl: 'https://dashboard.exa.ai/api-keys',
        defaults: [
            { label: 'Search type', value: 'Auto hybrid search' },
            { label: 'Results', value: '10 results' },
            { label: 'Text', value: '3000 characters per result' },
            { label: 'Livecrawl', value: 'Fallback when freshness matters' },
        ],
        dialogDescription: 'Save the Exa API key used to expose the `webSearch()` tool during chat streams.',
        emptyRuntimeDescription: 'Add your Exa API key to make the web search option available in chat.',
        enabledRuntimeDescription: 'Exa web search is available to chats that need fresh results.',
        disabledRuntimeDescription: 'Exa is saved, but chats will not use web search until you enable it.',
        emptyApiKeyPlaceholder: 'Enter your Exa API key',
        savedApiKeyPlaceholder: 'Leave blank to keep the saved key',
        emptyApiKeyHelperText: 'The key is stored securely and used only for Exa web search.',
        savedApiKeyHelperText: 'Leave this blank to keep the existing key. Enter a new key to rotate it.',
        removeDescription: 'This removes the saved Exa API key and disables the web-search option for future chats.',
        storageBadge: 'API key saved securely',
        addLabel: 'Add Exa',
        editLabel: 'Edit Exa',
        saveLabel: 'Save Exa',
        icon: Search,
    },
    {
        id: PARALLEL_WEB_SEARCH_PROVIDER_ID,
        name: 'Parallel',
        title: 'Parallel web search',
        description: "Adds Parallel's search and extraction registry tools for broader web context in chat.",
        docsUrl: 'https://ai-sdk.dev/tools-registry/parallel',
        apiKeyUrl: 'https://platform.parallel.ai',
        defaults: [
            { label: 'Search tool', value: 'searchTool' },
            { label: 'Extract tool', value: 'extractTool' },
            { label: 'Output', value: 'Compressed web context' },
            { label: 'Best for', value: 'Search + page extraction' },
        ],
        dialogDescription:
            'Store a Parallel API key in renderer state for this frontend-only search and extraction flow.',
        emptyRuntimeDescription: 'Add a Parallel API key to make the Parallel option available in chat.',
        enabledRuntimeDescription: 'Parallel search and extraction are available to chats in this frontend-only flow.',
        disabledRuntimeDescription: 'Parallel is configured, but chats will not use it until you enable it.',
        emptyApiKeyPlaceholder: 'Enter your Parallel API key',
        savedApiKeyPlaceholder: 'Leave blank to keep the in-memory key',
        emptyApiKeyHelperText: 'This key stays in Redux state only for the frontend preview flow.',
        savedApiKeyHelperText: 'Leave this blank to keep the current in-memory key for this session.',
        removeDescription:
            'This removes the in-memory Parallel API key from Redux state and disables the option for future chats.',
        storageBadge: 'API key kept in Redux state',
        addLabel: 'Add Parallel',
        editLabel: 'Edit Parallel',
        saveLabel: 'Save Parallel',
        icon: Globe,
    },
];

function toFrontendConfig(
    config: { enabled: boolean; hasApiKey: boolean } | null,
): FrontendWebSearchProviderConfig | null {
    return config
        ? {
              enabled: config.enabled,
              hasApiKey: config.hasApiKey,
          }
        : null;
}

export function WebSearchManagement() {
    const dispatch = useAppDispatch();
    const exaConfig = useAppSelector((state) => state.webSearch.config);
    const parallelConfig = useAppSelector((state) => state.webSearch.parallelConfig);
    const status = useAppSelector((state) => state.webSearch.status);
    const optionsStatus = useAppSelector((state) => state.webSearch.optionsStatus);
    const errorMessage = useAppSelector((state) => state.webSearch.errorMessage);
    const [activeDialogProviderId, setActiveDialogProviderId] = useState<WebSearchProviderId | null>(null);
    const [activeDeleteProviderId, setActiveDeleteProviderId] = useState<WebSearchProviderId | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [enabled, setEnabled] = useState(true);
    const [formError, setFormError] = useState<string | null>(null);

    useEffect(() => {
        if (status === 'idle') {
            void dispatch(loadWebSearchConfig());
        }
        if (optionsStatus === 'idle') {
            void dispatch(loadWebSearchOptions());
        }
    }, [dispatch, optionsStatus, status]);

    const providerConfigs = useMemo<Record<WebSearchProviderId, FrontendWebSearchProviderConfig | null>>(
        () => ({
            [WebSearchProviderTypeEnum.EXA]: toFrontendConfig(exaConfig),
            [PARALLEL_WEB_SEARCH_PROVIDER_ID]: parallelConfig,
        }),
        [exaConfig, parallelConfig],
    );

    const activeProvider = useMemo(
        () => providerDefinitions.find((provider) => provider.id === activeDialogProviderId) ?? null,
        [activeDialogProviderId],
    );
    const activeDeleteProvider = useMemo(
        () => providerDefinitions.find((provider) => provider.id === activeDeleteProviderId) ?? null,
        [activeDeleteProviderId],
    );
    const activeProviderConfig = activeProvider ? providerConfigs[activeProvider.id] : null;

    const openDialog = (providerId: WebSearchProviderId) => {
        setApiKey('');
        setEnabled(providerConfigs[providerId]?.enabled ?? true);
        setFormError(null);
        setActiveDialogProviderId(providerId);
    };

    const handleCloseDialog = () => {
        setActiveDialogProviderId(null);
        setApiKey('');
        setFormError(null);
    };

    const handleSave = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!activeProvider) {
            return;
        }

        setIsSubmitting(true);
        setFormError(null);

        try {
            if (activeProvider.id === WebSearchProviderTypeEnum.EXA) {
                await dispatch(
                    saveWebSearchConfig({
                        type: WebSearchProviderTypeEnum.EXA,
                        enabled,
                        apiKey,
                    }),
                ).unwrap();
            } else {
                dispatch(saveParallelWebSearchConfig({ enabled, apiKey }));
            }
            handleCloseDialog();
        } catch (error) {
            setFormError(error instanceof Error ? error.message : `Failed to save ${activeProvider.name} settings.`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleEnabled = async (providerId: WebSearchProviderId, checked: boolean) => {
        const providerConfig = providerConfigs[providerId];
        if (!providerConfig) {
            return;
        }

        setFormError(null);
        if (providerId === WebSearchProviderTypeEnum.EXA) {
            try {
                await dispatch(
                    saveWebSearchConfig({
                        type: WebSearchProviderTypeEnum.EXA,
                        enabled: checked,
                    }),
                ).unwrap();
            } catch (error) {
                setFormError(error instanceof Error ? error.message : 'Failed to update Exa settings.');
            }
            return;
        }

        dispatch(saveParallelWebSearchConfig({ enabled: checked }));
    };

    const handleDelete = async () => {
        if (!activeDeleteProvider) {
            return;
        }

        setIsSubmitting(true);
        setFormError(null);

        try {
            if (activeDeleteProvider.id === WebSearchProviderTypeEnum.EXA) {
                await dispatch(deleteWebSearchConfig()).unwrap();
            } else {
                dispatch(deleteParallelWebSearchConfig());
            }
            setActiveDeleteProviderId(null);
        } catch (error) {
            setFormError(
                error instanceof Error ? error.message : `Failed to remove ${activeDeleteProvider.name} settings.`,
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <header className="space-y-1">
                <h1 className="text-2xl font-semibold">Web search</h1>
                <p className="text-sm text-muted-foreground">
                    Configure frontend web-search providers that can be surfaced in chat.
                </p>
            </header>

            <div className="grid gap-6 xl:grid-cols-2">
                {providerDefinitions.map((provider) => {
                    const config = providerConfigs[provider.id];
                    const Icon = provider.icon;

                    return (
                        <Card className="border-border/80" key={provider.id}>
                            <CardHeader className="gap-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <div className="flex size-10 items-center justify-center rounded-lg border bg-secondary text-secondary-foreground">
                                                <Icon className="size-4" aria-hidden="true" />
                                            </div>
                                            <div>
                                                <h2 className="text-base font-semibold">{provider.title}</h2>
                                                <CardDescription>{provider.description}</CardDescription>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Badge variant={config ? 'secondary' : 'outline'}>
                                                {config ? 'Configured' : 'Not configured'}
                                            </Badge>
                                            {config && (
                                                <Badge variant={config.enabled ? 'default' : 'outline'}>
                                                    {config.enabled ? 'Enabled' : 'Disabled'}
                                                </Badge>
                                            )}
                                            {config?.hasApiKey && (
                                                <Badge variant="outline">{provider.storageBadge}</Badge>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Button asChild size="sm" variant="outline">
                                            <a href={provider.docsUrl} target="_blank" rel="noreferrer">
                                                Docs
                                                <ExternalLink className="size-4" aria-hidden="true" />
                                            </a>
                                        </Button>
                                        <Button asChild size="sm" variant="outline">
                                            <a href={provider.apiKeyUrl} target="_blank" rel="noreferrer">
                                                API Keys
                                                <KeyRound className="size-4" aria-hidden="true" />
                                            </a>
                                        </Button>
                                        <Button onClick={() => openDialog(provider.id)} size="sm">
                                            {config ? provider.editLabel : provider.addLabel}
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {provider.defaults.map((item) => (
                                        <div key={item.label} className="rounded-lg border bg-background p-3">
                                            <p className="text-xs text-muted-foreground">{item.label}</p>
                                            <p className="mt-1 text-sm font-medium">{item.value}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex flex-col gap-4 rounded-lg border bg-secondary/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-sm font-medium">
                                            <Globe className="size-4" aria-hidden="true" />
                                            Runtime status
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            {!config
                                                ? provider.emptyRuntimeDescription
                                                : config.enabled
                                                  ? provider.enabledRuntimeDescription
                                                  : provider.disabledRuntimeDescription}
                                        </p>
                                    </div>
                                    {config ? (
                                        <div className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2 sm:min-w-56">
                                            <label className="text-sm font-medium" htmlFor={`${provider.id}-enabled`}>
                                                Enabled
                                            </label>
                                            <Switch
                                                id={`${provider.id}-enabled`}
                                                checked={config.enabled}
                                                disabled={isSubmitting}
                                                onCheckedChange={(checked) => {
                                                    void handleToggleEnabled(provider.id, checked);
                                                }}
                                            />
                                        </div>
                                    ) : null}
                                </div>

                                {config && (
                                    <div className="flex flex-wrap gap-2">
                                        <Button variant="outline" size="sm" onClick={() => openDialog(provider.id)}>
                                            Update settings
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-destructive hover:text-destructive"
                                            onClick={() => setActiveDeleteProviderId(provider.id)}
                                        >
                                            <Trash2 className="size-4" aria-hidden="true" />
                                            Remove {provider.name}
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {(formError ?? errorMessage) && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {formError ?? errorMessage}
                </div>
            )}

            <Dialog
                open={activeProvider !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        handleCloseDialog();
                    }
                }}
            >
                <DialogContent className="sm:max-w-[520px]">
                    <DialogHeader>
                        <DialogTitle>
                            {activeProviderConfig ? `Edit ${activeProvider?.title}` : `Add ${activeProvider?.title}`}
                        </DialogTitle>
                        <DialogDescription>{activeProvider?.dialogDescription}</DialogDescription>
                    </DialogHeader>
                    <form
                        className="space-y-4"
                        onSubmit={(event) => {
                            void handleSave(event);
                        }}
                    >
                        <div className="space-y-2">
                            <label className="text-sm font-medium" htmlFor="web-search-api-key">
                                API key
                            </label>
                            <Input
                                id="web-search-api-key"
                                type="password"
                                placeholder={
                                    activeProviderConfig
                                        ? activeProvider?.savedApiKeyPlaceholder
                                        : activeProvider?.emptyApiKeyPlaceholder
                                }
                                value={apiKey}
                                onChange={(event) => setApiKey(event.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                {activeProviderConfig
                                    ? activeProvider?.savedApiKeyHelperText
                                    : activeProvider?.emptyApiKeyHelperText}
                            </p>
                        </div>

                        <div className="flex items-center justify-between rounded-md border px-3 py-2">
                            <label className="text-sm font-medium" htmlFor="web-search-enabled-dialog">
                                Enable immediately
                            </label>
                            <Switch id="web-search-enabled-dialog" checked={enabled} onCheckedChange={setEnabled} />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={handleCloseDialog}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? 'Saving...' : activeProvider?.saveLabel}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={activeDeleteProvider !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setActiveDeleteProviderId(null);
                    }
                }}
                title={activeDeleteProvider ? `Remove ${activeDeleteProvider.title}?` : 'Remove web search?'}
                description={activeDeleteProvider?.removeDescription ?? 'Remove this web-search provider.'}
                confirmText="Remove"
                variant="destructive"
                onConfirm={() => {
                    void handleDelete();
                }}
            />
        </div>
    );
}
