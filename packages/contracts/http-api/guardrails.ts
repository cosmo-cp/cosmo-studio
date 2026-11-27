import type { GuardrailsConfigSaveInput, GuardrailsConfigView, GuardrailsEvaluateResult } from 'core/dto';
import type { GuardrailsApi } from '../contracts/guardrails';
import { callRpc } from './common';

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
