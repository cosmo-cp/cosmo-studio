import { useBackendMutation, useBackendQuery } from '@/lib/store/backend-hooks';
import { buildWebSearchOptions, type FrontendWebSearchProviderConfig } from '@/lib/web-search-options';
import { WebSearchProviderTypeEnum } from 'core/database/schema/webSearchConfigSchema';
import type { WebSearchConfigSaveInput } from 'core/dto';

const webSearchKeys = {
    config: ['web-search', 'config', WebSearchProviderTypeEnum.EXA] as const,
    options: (parallelConfig: FrontendWebSearchProviderConfig | null) =>
        ['web-search', 'options', parallelConfig?.enabled ?? null, parallelConfig?.hasApiKey ?? null] as const,
};

export function useGetWebSearchConfigQuery() {
    return useBackendQuery(webSearchKeys.config, (appDataSource) =>
        appDataSource.webSearch.getConfig(WebSearchProviderTypeEnum.EXA),
    );
}

export function useGetWebSearchOptionsQuery(parallelConfig: FrontendWebSearchProviderConfig | null) {
    return useBackendQuery(webSearchKeys.options(parallelConfig), async (appDataSource) => {
        const exaConfig = await appDataSource.webSearch.getConfig(WebSearchProviderTypeEnum.EXA);
        return {
            exaConfig,
            parallelConfig,
            options: buildWebSearchOptions({
                exaConfig,
                parallelConfig,
            }),
        };
    });
}

export function useSaveWebSearchConfigMutation() {
    return useBackendMutation({
        errorMessage: 'Failed to save web search settings',
        run: (appDataSource, input: WebSearchConfigSaveInput) => appDataSource.webSearch.saveConfig(input),
        revalidate: async (_arg, result, { setCachedValue }) => {
            await setCachedValue(webSearchKeys.config, result);
        },
    });
}

export function useDeleteWebSearchConfigMutation() {
    return useBackendMutation({
        errorMessage: 'Failed to remove web search settings',
        run: (appDataSource, _arg: void) => {
            void _arg;
            return appDataSource.webSearch.deleteConfig(WebSearchProviderTypeEnum.EXA);
        },
        revalidate: async (_arg, _result, { setCachedValue }) => {
            await setCachedValue(webSearchKeys.config, null);
        },
    });
}
