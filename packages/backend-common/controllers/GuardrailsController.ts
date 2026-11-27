import type { GuardrailsConfigSaveInput, GuardrailsConfigView, GuardrailsEvaluateResult } from 'core/dto';
import { GuardrailsService } from 'core/services/GuardrailsService';
import { CORETYPES } from 'core/types/types';
import { inject, injectable } from 'inversify';
import { z } from 'zod';
import { IpcController, IpcHandler } from '../ipc/Decorators';
import { Controller } from './Controller';

const guardrailsSaveSchema = z
    .object({
        enabled: z.boolean(),
        injectionEnabled: z.boolean(),
        injectionMode: z.enum(['heuristic', 'pattern']),
        injectionThreshold: z.number().min(0).max(1),
        leakageEnabled: z.boolean(),
        leakageMode: z.enum(['heuristic', 'pattern']),
        leakageThreshold: z.number().min(0).max(1),
        piiEnabled: z.boolean(),
        piiMode: z.enum(['redact', 'block']),
        secretEnabled: z.boolean(),
        secretMode: z.enum(['block', 'redact']),
    })
    .strict();

const evaluateInputSchema = z.string();

@injectable()
@IpcController('guardrails')
export class GuardrailsController implements Controller {
    constructor(
        @inject(CORETYPES.GuardrailsService)
        private readonly guardrailsService: GuardrailsService,
    ) {}

    // Retrieves current guardrails settings.
    @IpcHandler('getConfig', z.tuple([]))
    public async getConfig(): Promise<GuardrailsConfigView> {
        return this.guardrailsService.getConfig();
    }

    // Persists updated guardrails configuration.
    @IpcHandler('saveConfig', z.tuple([guardrailsSaveSchema]))
    public async saveConfig(input: GuardrailsConfigSaveInput): Promise<GuardrailsConfigView> {
        const parsedInput = guardrailsSaveSchema.parse(input);
        return this.guardrailsService.saveConfig(parsedInput);
    }

    // Evaluates test text against active guardrails.
    @IpcHandler('evaluate', z.tuple([evaluateInputSchema]))
    public async evaluate(text: string): Promise<GuardrailsEvaluateResult> {
        const parsedText = evaluateInputSchema.parse(text);
        return this.guardrailsService.evaluateText(parsedText, 'user');
    }
}
