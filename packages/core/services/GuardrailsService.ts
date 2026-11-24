import type { LanguageModelV4Middleware } from '@ai-sdk/provider';
import {
    GuardrailsEngine,
    injectionGuard,
    leakageGuard,
    piiGuard,
    secretGuard,
    SelectionType,
    type Guard,
} from '@presidio-dev/hai-guardrails';
import { inject, injectable } from 'inversify';
import type {
    GuardrailFinding,
    GuardrailsConfigSaveInput,
    GuardrailsConfigView,
    GuardrailsEvaluateResult,
} from '../dto';
import { GuardrailsConfigRepository } from '../repositories/GuardrailsConfigRepository';
import { CORETYPES } from '../types/types';
import { createGuardrailsMiddleware } from './GuardrailsMiddleware';

export class GuardrailViolationError extends Error {
    constructor(
        message: string,
        public readonly findings: GuardrailFinding[],
    ) {
        super(message);
        this.name = 'GuardrailViolationError';
    }
}

const DEFAULT_CONFIG: Omit<GuardrailsConfigView, 'id' | 'createdAt' | 'updatedAt'> = {
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

@injectable()
export class GuardrailsService {
    constructor(
        @inject(CORETYPES.GuardrailsConfigRepository)
        private readonly repository: GuardrailsConfigRepository,
    ) {}

    /**
     * Retrieves the current guardrails configuration view or returns default settings.
     */
    public async getConfig(): Promise<GuardrailsConfigView> {
        const stored = await this.repository.get();
        if (!stored) {
            return {
                id: 'default',
                createdAt: new Date(),
                updatedAt: null,
                ...DEFAULT_CONFIG,
            };
        }

        return {
            id: stored.id,
            createdAt: new Date(stored.createdAt),
            updatedAt: stored.updatedAt ? new Date(stored.updatedAt) : null,
            enabled: stored.enabled,
            injectionEnabled: stored.injectionEnabled,
            injectionMode: stored.injectionMode as 'heuristic' | 'pattern',
            injectionThreshold: stored.injectionThreshold,
            leakageEnabled: stored.leakageEnabled,
            leakageMode: stored.leakageMode as 'heuristic' | 'pattern',
            leakageThreshold: stored.leakageThreshold,
            piiEnabled: stored.piiEnabled,
            piiMode: stored.piiMode as 'redact' | 'block',
            secretEnabled: stored.secretEnabled,
            secretMode: stored.secretMode as 'block' | 'redact',
        };
    }

    /**
     * Persists new guardrail configuration options and returns the updated view.
     */
    public async saveConfig(input: GuardrailsConfigSaveInput): Promise<GuardrailsConfigView> {
        const updated = await this.repository.save(input);
        return {
            id: updated.id,
            createdAt: new Date(updated.createdAt),
            updatedAt: updated.updatedAt ? new Date(updated.updatedAt) : null,
            enabled: updated.enabled,
            injectionEnabled: updated.injectionEnabled,
            injectionMode: updated.injectionMode as 'heuristic' | 'pattern',
            injectionThreshold: updated.injectionThreshold,
            leakageEnabled: updated.leakageEnabled,
            leakageMode: updated.leakageMode as 'heuristic' | 'pattern',
            leakageThreshold: updated.leakageThreshold,
            piiEnabled: updated.piiEnabled,
            piiMode: updated.piiMode as 'redact' | 'block',
            secretEnabled: updated.secretEnabled,
            secretMode: updated.secretMode as 'block' | 'redact',
        };
    }

    /**
     * Builds a configured GuardrailsEngine instance based on current settings.
     */
    public async createEngine(overrideConfig?: Partial<GuardrailsConfigView>): Promise<GuardrailsEngine> {
        const config = {
            ...(await this.getConfig()),
            ...overrideConfig,
        };

        const guards: Guard[] = [];

        if (config.enabled) {
            if (config.injectionEnabled) {
                guards.push(
                    injectionGuard(
                        { roles: ['user', 'human'] },
                        {
                            mode: config.injectionMode,
                            threshold: config.injectionThreshold,
                        },
                    ),
                );
            }

            if (config.leakageEnabled) {
                guards.push(
                    leakageGuard(
                        { roles: ['user', 'human'] },
                        {
                            mode: config.leakageMode,
                            threshold: config.leakageThreshold,
                        },
                    ),
                );
            }

            if (config.piiEnabled) {
                guards.push(
                    piiGuard({
                        selection: SelectionType.All,
                        mode: config.piiMode,
                    }),
                );
            }

            if (config.secretEnabled) {
                guards.push(
                    secretGuard({
                        selection: SelectionType.All,
                        mode: config.secretMode,
                    }),
                );
            }
        }

        return new GuardrailsEngine({ guards: guards });
    }

    /**
     * Evaluates a piece of text against active guardrails.
     * Useful for testing and interactive playgrounds.
     */
    public async evaluateText(text: string, role = 'user'): Promise<GuardrailsEvaluateResult> {
        const config = await this.getConfig();
        if (!config.enabled) {
            return {
                passed: true,
                blocked: false,
                redacted: false,
                violations: [],
                sanitizedText: text,
                originalText: text,
            };
        }

        const engine = await this.createEngine(config);
        const result = await engine.run([{ role: role, content: text }]);

        const violations: GuardrailFinding[] = [];
        let sanitizedText = text;

        if (result.messages && result.messages.length > 0) {
            sanitizedText = result.messages[0].content;
        }

        for (const guardRes of result.messagesWithGuardResult) {
            for (const msgRes of guardRes.messages) {
                if (!msgRes.passed) {
                    violations.push({
                        guardId: guardRes.guardId,
                        guardName: guardRes.guardName,
                        passed: false,
                        reason: msgRes.reason ?? `${guardRes.guardName} flagged input`,
                    });
                }
            }
        }

        const blockingViolations = violations.filter((v) => {
            if (v.guardId === 'pii' && config.piiMode === 'redact') return false;
            if (v.guardId === 'secret' && config.secretMode === 'redact') return false;
            return true;
        });

        const blocked = blockingViolations.length > 0;
        const redacted = sanitizedText !== text;

        return {
            passed: !blocked,
            blocked: blocked,
            redacted: redacted,
            violations: violations,
            sanitizedText: sanitizedText,
            originalText: text,
        };
    }

    /**
     * Sanitizes or validates user message text for chat execution.
     * Throws GuardrailViolationError if an injection, leakage, or blocked secret/PII is detected.
     * Returns the sanitized text (e.g. with redacted PII) if valid.
     */
    public async sanitizeInput(text: string): Promise<string> {
        const evaluation = await this.evaluateText(text, 'user');
        if (evaluation.blocked) {
            const reasons = evaluation.violations
                .map((v) => {
                    return `${v.guardName}: ${v.reason}`;
                })
                .join('; ');
            throw new GuardrailViolationError(`Guardrail violation detected: ${reasons}`, evaluation.violations);
        }
        return evaluation.sanitizedText ?? text;
    }

    /**
     * Creates an AI SDK LanguageModelV4 middleware that enforces
     * prompt input and model output guardrails.
     */
    public createMiddleware(): LanguageModelV4Middleware {
        return createGuardrailsMiddleware(this);
    }
}
