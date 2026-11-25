import type {
    GuardrailsConfigSaveInput,
    GuardrailsConfigView,
    GuardrailsEvaluateResult,
} from '../../../packages/core/dto';

export interface GuardrailsApi {
    getConfig(): Promise<GuardrailsConfigView>;
    saveConfig(input: GuardrailsConfigSaveInput): Promise<GuardrailsConfigView>;
    evaluate(text: string): Promise<GuardrailsEvaluateResult>;
}
