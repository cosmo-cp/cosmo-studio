import type {
    Guard,
    GuardrailsEngineOptions,
    GuardrailsEngineResult,
    GuardResult,
    LLMEngineMessage,
    LLMMessage,
} from './types';

/**
 * The GuardrailsEngine executes configured security guards sequentially across an array of messages.
 * It accumulates modifications (e.g. redactions) and aggregates all guard findings.
 */
export class GuardrailsEngine {
    private enabled: boolean;
    private guards: Guard[];

    constructor(opts: GuardrailsEngineOptions = {}) {
        this.enabled = opts.enabled ?? true;
        this.guards = opts.guards ?? [];
    }

    get isEnabled(): boolean {
        return this.enabled;
    }

    get isDisabled(): boolean {
        return !this.enabled;
    }

    enable(): void {
        this.enabled = true;
    }

    disable(): void {
        this.enabled = false;
    }

    /**
     * Executes all configured guards across the messages in sequence.
     */
    async run(messages: LLMMessage[]): Promise<GuardrailsEngineResult> {
        const currentMessages: LLMMessage[] = messages.map((m) => {
            return { ...m };
        });
        const rawGuardResults: GuardResult[][] = [];

        if (!this.enabled || this.guards.length === 0) {
            return {
                messages: currentMessages,
                messagesWithGuardResult: [],
            };
        }

        for (const guard of this.guards) {
            const engineMessages: LLMEngineMessage[] = currentMessages.map((msg) => {
                return {
                    originalMessage: msg,
                    inScope: true,
                };
            });

            const guardResults = await guard(engineMessages);
            rawGuardResults.push(guardResults);

            // If any guard modified message content (e.g., PII or secret redaction), apply it
            for (let i = 0; i < guardResults.length; i++) {
                const res = guardResults[i];
                if (res.modifiedMessage && currentMessages[i]) {
                    currentMessages[i] = {
                        ...currentMessages[i],
                        content: res.modifiedMessage.content,
                    };
                }
            }
        }

        // Group results by guardId preserving guardName
        const grouped = new Map<string, { guardName: string; messages: Array<{ passed: boolean; reason?: string }> }>();

        for (const guardResults of rawGuardResults) {
            for (const res of guardResults) {
                if (!grouped.has(res.guardId)) {
                    grouped.set(res.guardId, {
                        guardName: res.guardName,
                        messages: [],
                    });
                }
                grouped.get(res.guardId)!.messages.push({
                    passed: res.passed,
                    reason: res.reason,
                });
            }
        }

        const messagesWithGuardResult = Array.from(grouped.entries()).map(([guardId, val]) => {
            return {
                guardId: guardId,
                guardName: val.guardName,
                messages: val.messages,
            };
        });

        return {
            messages: currentMessages,
            messagesWithGuardResult: messagesWithGuardResult,
        };
    }
}
