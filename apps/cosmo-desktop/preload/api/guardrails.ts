import type { GuardrailsApi } from 'contracts/contracts/guardrails';
import type { GuardrailsConfigSaveInput } from 'core/dto';
import { ipcRenderer } from 'electron';

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
