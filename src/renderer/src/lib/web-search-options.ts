import type {WebSearchConfigView} from "core/dto";
import {WebSearchProviderTypeEnum} from "core/database/schema/webSearchConfigSchema";

export const WEB_SEARCH_NONE_OPTION_ID = "__web_search_none__";

export interface WebSearchOption {
    id: string;
    label: string;
    disabled?: boolean;
}

// Keep the chat dropdown labels consistent across the adapter, store, and UI.
export function buildWebSearchOptions(config: WebSearchConfigView | null): WebSearchOption[] {
    return [
        {
            id: WEB_SEARCH_NONE_OPTION_ID,
            label: "No web search",
        },
        {
            id: WebSearchProviderTypeEnum.EXA,
            label: "Exa web search",
            disabled: !config?.enabled,
        },
    ];
}
