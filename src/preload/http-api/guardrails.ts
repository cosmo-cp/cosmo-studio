import type {
    GuardrailsConfigSaveInput,
    GuardrailsConfigView,
    GuardrailsEvaluateResult,
} from '../../../packages/core/dto';
import { callRpc } from '../api/common';
import type { GuardrailsApi } from '../contracts/guardrails';

export const guardrailsHttpApi: GuardrailsApi = {
    getConfig: () => {
        return callRpc<GuardrailsConfigView>('guardrails', 'getConfig', []);
    },
    saveConfig: (input: GuardrailsConfigSaveInput) => {
        return callRpc<GuardrailsConfigView>('guardrails', 'saveConfig', [input]);
    },
    evaluate: (text: string) => {
        return callRpc<GuardrailsEvaluateResult>('guardrails', 'evaluate', [text]);
    },
};
