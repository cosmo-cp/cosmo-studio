import type {
    LanguageModelV4CallOptions,
    LanguageModelV4GenerateResult,
    LanguageModelV4Message,
    LanguageModelV4Middleware,
    LanguageModelV4StreamPart,
    LanguageModelV4StreamResult,
    LanguageModelV4TextPart,
} from '@ai-sdk/provider';
import { GuardrailsService, GuardrailViolationError } from './GuardrailsService';

/**
 * Creates an AI SDK LanguageModelV4 middleware that enforces prompt input and model output guardrails.
 *
 * - `transformParams`: Sanitizes or blocks input prompts before they reach the language model provider.
 * - `wrapGenerate`: Evaluates generated output for non-streaming calls, blocking violations or redacting sensitive data.
 * - `wrapStream`: Inspects streaming output chunks, halting the stream upon blocking violations and redacting PII/secrets.
 */
export function createGuardrailsMiddleware(guardrailsService: GuardrailsService): LanguageModelV4Middleware {
    return {
        specificationVersion: 'v4',

        transformParams: async ({ params }): Promise<LanguageModelV4CallOptions> => {
            const transformedPrompt = await Promise.all(
                params.prompt.map(async (message: LanguageModelV4Message): Promise<LanguageModelV4Message> => {
                    if (message.role !== 'user') {
                        return message;
                    }

                    const transformedContent = await Promise.all(
                        message.content.map(async (part) => {
                            if (part.type !== 'text') {
                                return part;
                            }

                            const evalResult = await guardrailsService.evaluateText(part.text, 'user');
                            if (evalResult.blocked) {
                                const reasons = evalResult.violations
                                    .map((v) => {
                                        return `${v.guardName}: ${v.reason}`;
                                    })
                                    .join('; ');
                                throw new GuardrailViolationError(
                                    `Guardrail violation detected in input prompt: ${reasons}`,
                                    evalResult.violations,
                                );
                            }

                            if (evalResult.redacted && evalResult.sanitizedText) {
                                return {
                                    ...part,
                                    text: evalResult.sanitizedText,
                                } as LanguageModelV4TextPart;
                            }

                            return part;
                        }),
                    );

                    return {
                        ...message,
                        content: transformedContent,
                    };
                }),
            );

            return {
                ...params,
                prompt: transformedPrompt,
            };
        },

        wrapGenerate: async ({ doGenerate }): Promise<LanguageModelV4GenerateResult> => {
            const result = await doGenerate();

            const textParts = result.content.filter((part) => {
                return part.type === 'text';
            });
            const combinedText = textParts
                .map((part) => {
                    return (part as { type: 'text'; text: string }).text;
                })
                .join('');

            if (combinedText) {
                const evalResult = await guardrailsService.evaluateText(combinedText, 'assistant');
                if (evalResult.blocked) {
                    const reasons = evalResult.violations
                        .map((v) => {
                            return `${v.guardName}: ${v.reason}`;
                        })
                        .join('; ');
                    throw new GuardrailViolationError(
                        `Guardrail violation detected in model output: ${reasons}`,
                        evalResult.violations,
                    );
                }

                if (evalResult.redacted && evalResult.sanitizedText) {
                    return {
                        ...result,
                        content: result.content.map((part) => {
                            if (part.type === 'text') {
                                return {
                                    ...part,
                                    text: evalResult.sanitizedText!,
                                };
                            }
                            return part;
                        }),
                    };
                }
            }

            return result;
        },

        wrapStream: async ({ doStream }): Promise<LanguageModelV4StreamResult> => {
            const config = await guardrailsService.getConfig();
            const requiresRedaction =
                config.enabled &&
                ((config.piiEnabled && config.piiMode === 'redact') ||
                    (config.secretEnabled && config.secretMode === 'redact'));

            const { stream, ...rest } = await doStream();
            let accumulatedText = '';

            const transformStream = new TransformStream<LanguageModelV4StreamPart, LanguageModelV4StreamPart>({
                transform: async function (chunk, controller) {
                    if (chunk.type === 'text-delta') {
                        accumulatedText += chunk.delta;
                        if (!requiresRedaction) {
                            controller.enqueue(chunk);
                        }
                    } else if (chunk.type === 'text-end') {
                        if (accumulatedText) {
                            const evalResult = await guardrailsService.evaluateText(accumulatedText, 'assistant');
                            if (evalResult.blocked) {
                                const reasons = evalResult.violations
                                    .map((v) => {
                                        return `${v.guardName}: ${v.reason}`;
                                    })
                                    .join('; ');
                                controller.error(
                                    new GuardrailViolationError(
                                        `Guardrail violation detected in output stream: ${reasons}`,
                                        evalResult.violations,
                                    ),
                                );
                                return;
                            }

                            if (requiresRedaction) {
                                if (evalResult.redacted && evalResult.sanitizedText) {
                                    controller.enqueue({
                                        type: 'text-delta',
                                        id: chunk.id,
                                        delta: evalResult.sanitizedText,
                                    });
                                } else {
                                    controller.enqueue({
                                        type: 'text-delta',
                                        id: chunk.id,
                                        delta: accumulatedText,
                                    });
                                }
                            }
                        }
                        controller.enqueue(chunk);
                    } else {
                        controller.enqueue(chunk);
                    }
                },
            });

            return {
                stream: stream.pipeThrough(transformStream),
                ...rest,
            };
        },
    };
}
