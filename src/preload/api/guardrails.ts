import { ipcRenderer } from 'electron';
import type { GuardrailsConfigSaveInput } from '../../../packages/core/dto';
import type { GuardrailsApi } from '../contracts/guardrails';

export const guardrailsApi: GuardrailsApi = {
    getConfig: () => {
        return ipcRenderer.invoke('guardrails:getConfig');
    },
    saveConfig: (input: GuardrailsConfigSaveInput) => {
        return ipcRenderer.invoke('guardrails:saveConfig', input);
    },
    evaluate: (text: string) => {
        return ipcRenderer.invoke('guardrails:evaluate', text);
    },
};
