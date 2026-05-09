import type {WebSearchConfigView} from "core/dto";
import {WebSearchProviderTypeEnum} from "core/database/schema/webSearchConfigSchema";

export const WEB_SEARCH_NONE_OPTION_ID = "__web_search_none__";
export const PARALLEL_WEB_SEARCH_PROVIDER_ID = "parallel";

export interface FrontendWebSearchProviderConfig {
    enabled: boolean;
    hasApiKey: boolean;
}

export interface WebSearchOption {
    id: string;
    label: string;
    disabled?: boolean;
    configured?: boolean;
    hasApiKey?: boolean;
}

interface BuildWebSearchOptionsInput {
    exaConfig: WebSearchConfigView | null;
    parallelConfig: FrontendWebSearchProviderConfig | null;
}

// Keep the chat dropdown labels consistent across the adapter, store, and UI.
export function buildWebSearchOptions({
    exaConfig,
    parallelConfig,
}: BuildWebSearchOptionsInput): WebSearchOption[] {
    return [
        {
            id: WEB_SEARCH_NONE_OPTION_ID,
            label: "Disabled"
        },
        {
            id: WebSearchProviderTypeEnum.EXA,
            label: "Exa web search",
            disabled: !exaConfig?.enabled,
            configured: Boolean(exaConfig),
            hasApiKey: exaConfig?.hasApiKey ?? false,
        },
        {
            id: PARALLEL_WEB_SEARCH_PROVIDER_ID,
            label: "Parallel web search",
            disabled: !parallelConfig?.enabled,
            configured: Boolean(parallelConfig),
            hasApiKey: parallelConfig?.hasApiKey ?? false,
        },
    ];
}

// Rehydrate renderer-only provider state from dummy adapter option payloads.
export function getFrontendWebSearchProviderConfig(
    options: WebSearchOption[],
    providerId: string
): FrontendWebSearchProviderConfig | null {
    const provider = options.find((option) => option.id === providerId);
    if (!provider?.configured) {
        return null;
    }

    return {
        enabled: !provider.disabled,
        hasApiKey: provider.hasApiKey ?? false,
    };
}
