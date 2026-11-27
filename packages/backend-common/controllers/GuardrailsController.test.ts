import type { GuardrailsConfigSaveInput, GuardrailsConfigView, GuardrailsEvaluateResult } from 'core/dto';
import type { GuardrailsService } from 'core/services/GuardrailsService';
import { describe, expect, it, vi } from 'vitest';
import { GuardrailsController } from './GuardrailsController';

describe('GuardrailsController', () => {
    it('delegates getConfig to the service', async () => {
        const mockConfig: GuardrailsConfigView = {
            id: 'test-id',
            createdAt: new Date(),
            updatedAt: null,
            enabled: true,
            injectionEnabled: true,
            injectionMode: 'heuristic',
            injectionThreshold: 0.7,
            leakageEnabled: true,
            leakageMode: 'heuristic',
            leakageThreshold: 0.7,
            piiEnabled: true,
            piiMode: 'redact',
            secretEnabled: true,
            secretMode: 'block',
        };

        const service = {
            getConfig: vi.fn().mockResolvedValue(mockConfig),
        } as unknown as GuardrailsService;

        const controller = new GuardrailsController(service);
        const result = await controller.getConfig();

        expect(service.getConfig).toHaveBeenCalled();
        expect(result).toBe(mockConfig);
    });

    it('validates and saves configuration', async () => {
        const input: GuardrailsConfigSaveInput = {
            enabled: true,
            injectionEnabled: true,
            injectionMode: 'pattern',
            injectionThreshold: 0.85,
            leakageEnabled: true,
            leakageMode: 'pattern',
            leakageThreshold: 0.85,
            piiEnabled: true,
            piiMode: 'block',
            secretEnabled: true,
            secretMode: 'redact',
        };

        const service = {
            saveConfig: vi.fn().mockResolvedValue({ id: 'saved-id', ...input } as unknown as GuardrailsConfigView),
        } as unknown as GuardrailsService;

        const controller = new GuardrailsController(service);
        const result = await controller.saveConfig(input);

        expect(service.saveConfig).toHaveBeenCalledWith(input);
        expect(result.id).toBe('saved-id');
    });

    it('delegates text evaluation to the service', async () => {
        const mockResult: GuardrailsEvaluateResult = {
            passed: true,
            blocked: false,
            redacted: false,
            violations: [],
            sanitizedText: 'Clean prompt',
            originalText: 'Clean prompt',
        };

        const service = {
            evaluateText: vi.fn().mockResolvedValue(mockResult),
        } as unknown as GuardrailsService;

        const controller = new GuardrailsController(service);
        const result = await controller.evaluate('Clean prompt');

        expect(service.evaluateText).toHaveBeenCalledWith('Clean prompt', 'user');
        expect(result).toBe(mockResult);
    });
});
