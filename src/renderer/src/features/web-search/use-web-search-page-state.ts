'use client';

import {
    useDeleteWebSearchConfigMutation,
    useGetWebSearchConfigQuery,
    useSaveWebSearchConfigMutation,
} from '@/features/web-search/web-search-api';
import { useAppStore } from '@/lib/store/hooks';
import { PARALLEL_WEB_SEARCH_PROVIDER_ID, type FrontendWebSearchProviderConfig } from '@/lib/web-search-options';
import { WebSearchProviderTypeEnum } from 'core/database/schema/webSearchConfigSchema';
import type { LucideIcon } from 'lucide-react';
import { Globe, Search } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';

export type WebSearchProviderId = WebSearchProviderTypeEnum.EXA | typeof PARALLEL_WEB_SEARCH_PROVIDER_ID;

export interface WebSearchProviderDefinition {
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

export const webSearchProviderDefinitions: WebSearchProviderDefinition[] = [
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
        emptyApiKeyHelperText: 'This key stays in the local Zustand store only for the frontend preview flow.',
        savedApiKeyHelperText: 'Leave this blank to keep the current in-memory key for this session.',
        removeDescription:
            'This removes the in-memory Parallel API key from the local Zustand store and disables the option for future chats.',
        storageBadge: 'API key kept in Zustand state',
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

function getBackendErrorMessage(error: unknown, fallbackMessage: string): string {
    if (typeof error === 'string' && error.trim().length > 0) {
        return error;
    }

    if (error instanceof Error && error.message.trim().length > 0) {
        return error.message;
    }

    return fallbackMessage;
}

export function useWebSearchPageState() {
    const parallelConfig = useAppStore((state) => state.parallelConfig);
    const saveParallelWebSearchConfig = useAppStore((state) => state.saveParallelWebSearchConfig);
    const deleteParallelWebSearchConfig = useAppStore((state) => state.deleteParallelWebSearchConfig);
    const { data: exaConfig = null, isLoading, error } = useGetWebSearchConfigQuery();
    const [saveWebSearchConfig] = useSaveWebSearchConfigMutation();
    const [deleteWebSearchConfig] = useDeleteWebSearchConfigMutation();
    const [activeDialogProviderId, setActiveDialogProviderId] = useState<WebSearchProviderId | null>(null);
    const [activeDeleteProviderId, setActiveDeleteProviderId] = useState<WebSearchProviderId | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [enabled, setEnabled] = useState(true);
    const [formError, setFormError] = useState<string | null>(null);

    const providerConfigs = useMemo<Record<WebSearchProviderId, FrontendWebSearchProviderConfig | null>>(
        () => ({
            [WebSearchProviderTypeEnum.EXA]: toFrontendConfig(exaConfig),
            [PARALLEL_WEB_SEARCH_PROVIDER_ID]: parallelConfig,
        }),
        [exaConfig, parallelConfig],
    );

    const activeProvider = useMemo(
        () => webSearchProviderDefinitions.find((provider) => provider.id === activeDialogProviderId) ?? null,
        [activeDialogProviderId],
    );
    const activeDeleteProvider = useMemo(
        () => webSearchProviderDefinitions.find((provider) => provider.id === activeDeleteProviderId) ?? null,
        [activeDeleteProviderId],
    );
    const activeProviderConfig = activeProvider ? providerConfigs[activeProvider.id] : null;

    const openDialog = (providerId: WebSearchProviderId) => {
        setApiKey('');
        setEnabled(providerConfigs[providerId]?.enabled ?? true);
        setFormError(null);
        setActiveDialogProviderId(providerId);
    };

    const closeDialog = () => {
        setActiveDialogProviderId(null);
        setApiKey('');
        setFormError(null);
    };

    const saveProviderConfig = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!activeProvider) {
            return;
        }

        setIsSubmitting(true);
        setFormError(null);

        if (activeProvider.id === WebSearchProviderTypeEnum.EXA) {
            const result = await saveWebSearchConfig({
                type: WebSearchProviderTypeEnum.EXA,
                enabled,
                apiKey,
            });
            if ('error' in result) {
                setFormError(getBackendErrorMessage(result.error, `Failed to save ${activeProvider.name} settings.`));
                setIsSubmitting(false);
                return;
            }
        } else {
            saveParallelWebSearchConfig({ enabled, apiKey });
        }

        closeDialog();
        setIsSubmitting(false);
    };

    const toggleEnabled = async (providerId: WebSearchProviderId, checked: boolean) => {
        const providerConfig = providerConfigs[providerId];
        if (!providerConfig) {
            return;
        }

        setFormError(null);
        if (providerId === WebSearchProviderTypeEnum.EXA) {
            const result = await saveWebSearchConfig({
                type: WebSearchProviderTypeEnum.EXA,
                enabled: checked,
            });
            if ('error' in result) {
                setFormError(getBackendErrorMessage(result.error, 'Failed to update Exa settings.'));
            }
            return;
        }

        saveParallelWebSearchConfig({ enabled: checked });
    };

    const requestDeleteProvider = (providerId: WebSearchProviderId) => {
        setActiveDeleteProviderId(providerId);
    };

    const clearDeleteProvider = () => {
        setActiveDeleteProviderId(null);
    };

    const deleteProviderConfig = async () => {
        if (!activeDeleteProvider) {
            return;
        }

        setIsSubmitting(true);
        setFormError(null);

        if (activeDeleteProvider.id === WebSearchProviderTypeEnum.EXA) {
            const result = await deleteWebSearchConfig();
            if ('error' in result) {
                setFormError(
                    getBackendErrorMessage(result.error, `Failed to remove ${activeDeleteProvider.name} settings.`),
                );
                setIsSubmitting(false);
                return;
            }
        } else {
            deleteParallelWebSearchConfig();
        }

        setActiveDeleteProviderId(null);
        setIsSubmitting(false);
    };

    return {
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
    };
}
