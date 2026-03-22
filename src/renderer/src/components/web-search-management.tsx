'use client';

import {type FormEvent, useEffect, useState} from "react";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader} from "@/components/ui/card";
import {Badge} from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Switch} from "@/components/ui/switch";
import {ConfirmDialog} from "@/components/confirm-dialog";
import {useAppDispatch, useAppSelector} from "@/lib/store/hooks";
import {
    deleteWebSearchConfig,
    loadWebSearchConfig,
    saveWebSearchConfig,
} from "@/lib/store/web-search-store";
import {WebSearchProviderTypeEnum} from "core/database/schema/webSearchConfigSchema";
import {ExternalLink, Globe, KeyRound, Search, Trash2} from "lucide-react";

const exaDefaults = [
    {label: "Search type", value: "Auto hybrid search"},
    {label: "Results", value: "10 results"},
    {label: "Text", value: "3000 characters per result"},
    {label: "Livecrawl", value: "Fallback when freshness matters"},
];

export function WebSearchManagement() {
    const dispatch = useAppDispatch();
    const config = useAppSelector((state) => state.webSearch.config);
    const status = useAppSelector((state) => state.webSearch.status);
    const errorMessage = useAppSelector((state) => state.webSearch.errorMessage);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [apiKey, setApiKey] = useState("");
    const [enabled, setEnabled] = useState(true);
    const [formError, setFormError] = useState<string | null>(null);

    useEffect(() => {
        if (status === "idle") {
            void dispatch(loadWebSearchConfig());
        }
    }, [dispatch, status]);

    const openDialog = () => {
        setApiKey("");
        setEnabled(config?.enabled ?? true);
        setFormError(null);
        setIsDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setIsDialogOpen(false);
        setApiKey("");
        setFormError(null);
    };

    const handleSave = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsSubmitting(true);
        setFormError(null);

        try {
            await dispatch(saveWebSearchConfig({
                type: WebSearchProviderTypeEnum.EXA,
                enabled,
                apiKey,
            })).unwrap();
            handleCloseDialog();
        } catch (error) {
            setFormError(error instanceof Error ? error.message : "Failed to save Exa settings.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleEnabled = async (checked: boolean) => {
        if (!config) {
            return;
        }

        setFormError(null);
        try {
            await dispatch(saveWebSearchConfig({
                type: WebSearchProviderTypeEnum.EXA,
                enabled: checked,
            })).unwrap();
        } catch (error) {
            setFormError(error instanceof Error ? error.message : "Failed to update Exa settings.");
        }
    };

    const handleDelete = async () => {
        setIsSubmitting(true);
        setFormError(null);

        try {
            await dispatch(deleteWebSearchConfig()).unwrap();
            setIsDeleteDialogOpen(false);
        } catch (error) {
            setFormError(error instanceof Error ? error.message : "Failed to remove Exa settings.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <header className="space-y-1">
                <h1 className="text-2xl font-semibold">Web search</h1>
                <p className="text-sm text-muted-foreground">
                    Configure the Exa-powered `webSearch()` tool for chats that need current information.
                </p>
            </header>

            <Card className="border-border/80">
                <CardHeader className="gap-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <div
                                    className="flex size-10 items-center justify-center rounded-lg border bg-secondary text-secondary-foreground">
                                    <Search className="size-4" aria-hidden="true" />
                                </div>
                                <div>
                                    <h2 className="text-base font-semibold">Exa web search</h2>
                                    <CardDescription>
                                        Adds live web search to the chat tool set when you need fresh results.
                                    </CardDescription>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant={config ? "secondary" : "outline"}>
                                    {config ? "Configured" : "Not configured"}
                                </Badge>
                                {config && (
                                    <Badge variant={config.enabled ? "default" : "outline"}>
                                        {config.enabled ? "Enabled" : "Disabled"}
                                    </Badge>
                                )}
                                {config?.hasApiKey && (
                                    <Badge variant="outline">API key saved securely</Badge>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button asChild size="sm" variant="outline">
                                <a
                                    href="https://ai-sdk.dev/tools-registry/exa"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    Docs
                                    <ExternalLink className="size-4" aria-hidden="true" />
                                </a>
                            </Button>
                            <Button asChild size="sm" variant="outline">
                                <a
                                    href="https://dashboard.exa.ai/api-keys"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    API Keys
                                    <KeyRound className="size-4" aria-hidden="true" />
                                </a>
                            </Button>
                            <Button onClick={openDialog} size="sm">
                                {config ? "Edit Exa" : "Add Exa"}
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {exaDefaults.map((item) => (
                            <div
                                key={item.label}
                                className="rounded-lg border bg-background p-3"
                            >
                                <p className="text-xs text-muted-foreground">{item.label}</p>
                                <p className="mt-1 text-sm font-medium">{item.value}</p>
                            </div>
                        ))}
                    </div>

                    <div
                        className="flex flex-col gap-4 rounded-lg border bg-secondary/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm font-medium">
                                <Globe className="size-4" aria-hidden="true" />
                                Runtime status
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {config
                                    ? config.enabled
                                        ? "Exa web search is available to chats that decide to use tools."
                                        : "Exa is saved, but chats will not use web search until you enable it."
                                    : "Add your Exa API key to make the webSearch() tool available in chat."}
                            </p>
                        </div>
                        {config ? (
                            <div className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2 sm:min-w-48">
                                <label className="text-sm font-medium" htmlFor="exa-enabled">
                                    Enabled
                                </label>
                                <Switch
                                    id="exa-enabled"
                                    checked={config.enabled}
                                    disabled={isSubmitting}
                                    onCheckedChange={(checked) => {
                                        void handleToggleEnabled(checked);
                                    }}
                                />
                            </div>
                        ) : null}
                    </div>

                    {config && (
                        <div className="flex flex-wrap gap-2">
                            <Button variant="outline" size="sm" onClick={openDialog}>
                                Update settings
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setIsDeleteDialogOpen(true)}
                            >
                                <Trash2 className="size-4" aria-hidden="true" />
                                Remove Exa
                            </Button>
                        </div>
                    )}

                    {(formError ?? errorMessage) && (
                        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                            {formError ?? errorMessage}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={(open) => {
                if (!open) {
                    handleCloseDialog();
                    return;
                }
                setIsDialogOpen(true);
            }}>
                <DialogContent className="sm:max-w-[520px]">
                    <DialogHeader>
                        <DialogTitle>{config ? "Edit Exa web search" : "Add Exa web search"}</DialogTitle>
                        <DialogDescription>
                            Save the Exa API key used to expose the `webSearch()` tool during chat streams.
                        </DialogDescription>
                    </DialogHeader>
                    <form className="space-y-4" onSubmit={(event) => {
                        void handleSave(event);
                    }}>
                        <div className="space-y-2">
                            <label className="text-sm font-medium" htmlFor="exa-api-key">
                                API key
                            </label>
                            <Input
                                id="exa-api-key"
                                type="password"
                                placeholder={config ? "Leave blank to keep the saved key" : "Enter your Exa API key"}
                                value={apiKey}
                                onChange={(event) => setApiKey(event.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                {config
                                    ? "Leave this blank to keep the existing key. Enter a new key to rotate it."
                                    : "The key is stored securely and used only for Exa web search."}
                            </p>
                        </div>

                        <div className="flex items-center justify-between rounded-md border px-3 py-2">
                            <label className="text-sm font-medium" htmlFor="exa-enabled-dialog">
                                Enable Exa immediately
                            </label>
                            <Switch
                                id="exa-enabled-dialog"
                                checked={enabled}
                                onCheckedChange={setEnabled}
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={handleCloseDialog}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? "Saving..." : config ? "Save changes" : "Save Exa"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
                title="Remove Exa web search?"
                description="This removes the saved Exa API key and disables the webSearch() tool for future chats."
                confirmText="Remove"
                variant="destructive"
                onConfirm={() => {
                    void handleDelete();
                }}
            />
        </div>
    );
}
