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
import { useWebSearchPageState, webSearchProviderDefinitions } from '@/features/web-search/use-web-search-page-state';
import { ExternalLink, Globe, KeyRound, Trash2 } from 'lucide-react';

export function WebSearchManagement() {
    const {
        providerConfigs,
        activeProvider,
        activeDeleteProvider,
        activeProviderConfig,
        isLoading,
        error,
        isSubmitting,
        apiKey,
        enabled,
        formError,
        setApiKey,
        setEnabled,
        openDialog,
        closeDialog,
        saveProviderConfig,
        toggleEnabled,
        requestDeleteProvider,
        clearDeleteProvider,
        deleteProviderConfig,
    } = useWebSearchPageState();

    return (
        <div className="space-y-6">
            <header className="space-y-1">
                <h1 className="text-2xl font-semibold">Web search</h1>
                <p className="text-sm text-muted-foreground">
                    Configure frontend web-search providers that can be surfaced in chat.
                </p>
            </header>

            <div className="grid gap-6 xl:grid-cols-2">
                {webSearchProviderDefinitions.map((provider) => {
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
                                                disabled={isSubmitting || isLoading}
                                                onCheckedChange={(checked) => {
                                                    void toggleEnabled(provider.id, checked);
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
                                            onClick={() => requestDeleteProvider(provider.id)}
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

            {(formError ?? error) && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {formError ?? error ?? 'Failed to load web search settings'}
                </div>
            )}

            <Dialog
                open={activeProvider !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        closeDialog();
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
                            void saveProviderConfig(event);
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
                            <Button type="button" variant="ghost" onClick={closeDialog}>
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
                        clearDeleteProvider();
                    }
                }}
                title={activeDeleteProvider ? `Remove ${activeDeleteProvider.title}?` : 'Remove web search?'}
                description={activeDeleteProvider?.removeDescription ?? 'Remove this web-search provider.'}
                confirmText="Remove"
                variant="destructive"
                onConfirm={() => {
                    void deleteProviderConfig();
                }}
            />
        </div>
    );
}
