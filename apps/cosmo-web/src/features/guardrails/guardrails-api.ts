import { useBackendMutation, useBackendQuery } from '@/lib/store/backend-hooks';
import type { GuardrailsConfigSaveInput, GuardrailsEvaluateResult } from 'core/dto';

export const guardrailsKeys = {
    config: ['guardrails', 'config'] as const,
};

export function useGetGuardrailsConfigQuery() {
    return useBackendQuery(guardrailsKeys.config, (appDataSource) => appDataSource.guardrails.getConfig());
}

export function useSaveGuardrailsConfigMutation() {
    return useBackendMutation({
        errorMessage: 'Failed to save guardrails settings',
        successMessage: 'Guardrails settings saved successfully',
        run: (appDataSource, input: GuardrailsConfigSaveInput) => appDataSource.guardrails.saveConfig(input),
        revalidate: async (_arg, result, { setCachedValue }) => {
            await setCachedValue(guardrailsKeys.config, result);
        },
    });
}

export function useEvaluateGuardrailsMutation() {
    return useBackendMutation<string, GuardrailsEvaluateResult>({
        errorMessage: 'Failed to evaluate text with guardrails',
        run: (appDataSource, text: string) => appDataSource.guardrails.evaluate(text),
    });
}
