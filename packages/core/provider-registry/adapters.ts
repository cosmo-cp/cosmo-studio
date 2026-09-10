import { createAnthropic } from '@ai-sdk/anthropic';
import { createCohere } from '@ai-sdk/cohere';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createGroq } from '@ai-sdk/groq';
import { createHuggingFace } from '@ai-sdk/huggingface';
import { createMistral } from '@ai-sdk/mistral';
import { createMoonshotAI } from '@ai-sdk/moonshotai';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createPerplexity } from '@ai-sdk/perplexity';
import type { ProviderV4 } from '@ai-sdk/provider';
import { createXai } from '@ai-sdk/xai';
import { createOllama } from 'ai-sdk-ollama';
import type {
    ConnectionTestResult,
    EndpointPolicyContext,
    NormalizedConnectionConfig,
    ProviderAdapterV1,
    ResolvedSecretConnectionConfig,
    UnknownFieldMap,
    ValidationResult,
    ValidFieldMap,
} from './types';

type ProviderFactory = (input: ResolvedSecretConnectionConfig) => ProviderV4;

const createRemoteOptions = (input: ResolvedSecretConnectionConfig) => {
    return {
        ...(input.apiKey?.trim() ? { apiKey: input.apiKey.trim() } : {}),
        ...(input.baseURL?.trim() ? { baseURL: input.baseURL.trim() } : {}),
    };
};

// Implements shared connection hygiene while leaving provider SDK behavior inside reviewed factories.
function createAdapter(key: string, factory: ProviderFactory): ProviderAdapterV1 {
    return {
        key: key,
        apiVersion: 1,
        validateConnection: function (input: UnknownFieldMap, context: EndpointPolicyContext): ValidationResult {
            const allowedKeys = new Set(['apiKey', 'baseURL']);
            const unknownKey = Object.keys(input).find((fieldKey) => {
                return !allowedKeys.has(fieldKey);
            });
            if (unknownKey) {
                return { valid: false, code: 'unknown-field', message: `Unknown connection field: ${unknownKey}` };
            }

            if (input.apiKey !== undefined && typeof input.apiKey !== 'string') {
                return { valid: false, code: 'invalid-api-key', message: 'API key must be text.' };
            }
            if (input.baseURL !== undefined && typeof input.baseURL !== 'string') {
                return { valid: false, code: 'invalid-base-url', message: 'Base URL must be text.' };
            }

            if (typeof input.baseURL === 'string' && input.baseURL.trim()) {
                const endpoint = parseEndpoint(input.baseURL);
                if (!endpoint) {
                    return { valid: false, code: 'invalid-base-url', message: 'Base URL must be a valid URL.' };
                }
                if (endpoint.protocol !== 'https:' && !isAllowedHttpEndpoint(endpoint, context)) {
                    return {
                        valid: false,
                        code: 'unsafe-base-url',
                        message: 'Plain HTTP is only allowed for local endpoints.',
                    };
                }
            }

            return { valid: true, value: input as ValidFieldMap };
        },
        normalizeConnection: function (input: ValidFieldMap): NormalizedConnectionConfig {
            const normalized: NormalizedConnectionConfig = { ...input };
            if (typeof normalized.apiKey === 'string') {
                normalized.apiKey = normalized.apiKey.trim();
            }
            if (typeof normalized.baseURL === 'string') {
                normalized.baseURL = normalized.baseURL.trim().replace(/\/+$/, '');
            }
            return normalized;
        },
        createProvider: function (input: ResolvedSecretConnectionConfig): ProviderV4 {
            return factory(input);
        },
        testConnection: async function (
            _input: ResolvedSecretConnectionConfig,
            signal: AbortSignal,
        ): Promise<ConnectionTestResult> {
            if (signal.aborted) {
                return { ok: false, code: 'aborted', message: 'Connection test was cancelled.' };
            }
            return {
                ok: false,
                code: 'connection-test-unavailable',
                message: 'This adapter does not implement connection testing yet.',
            };
        },
    };
}

// Parses endpoints without throwing or including credential-bearing input in errors.
function parseEndpoint(value: string): URL | undefined {
    try {
        return new URL(value.trim());
    } catch {
        return undefined;
    }
}

// Restricts non-TLS endpoints to local routes or loopback-compatible services.
function isAllowedHttpEndpoint(endpoint: URL, context: EndpointPolicyContext): boolean {
    if (endpoint.protocol !== 'http:') {
        return false;
    }
    if (context.route === 'local') {
        return true;
    }
    const loopbackHosts = new Set(['127.0.0.1', 'localhost', '[::1]']);
    return context.route === 'compatible' && loopbackHosts.has(endpoint.hostname);
}

export const PROVIDER_ADAPTERS = new Map<string, ProviderAdapterV1>([
    [
        'openai-native',
        createAdapter('openai-native', (input) => {
            return createOpenAI({ name: input.displayName, ...createRemoteOptions(input) });
        }),
    ],
    [
        'anthropic-native',
        createAdapter('anthropic-native', (input) => {
            return createAnthropic(createRemoteOptions(input));
        }),
    ],
    [
        'google-native',
        createAdapter('google-native', (input) => {
            return createGoogleGenerativeAI(createRemoteOptions(input));
        }),
    ],
    [
        'xai-native',
        createAdapter('xai-native', (input) => {
            return createXai(createRemoteOptions(input));
        }),
    ],
    [
        'groq-native',
        createAdapter('groq-native', (input) => {
            return createGroq(createRemoteOptions(input));
        }),
    ],
    [
        'mistral-native',
        createAdapter('mistral-native', (input) => {
            return createMistral(createRemoteOptions(input));
        }),
    ],
    [
        'deepseek-native',
        createAdapter('deepseek-native', (input) => {
            return createDeepSeek(createRemoteOptions(input));
        }),
    ],
    [
        'moonshot-native',
        createAdapter('moonshot-native', (input) => {
            return createMoonshotAI(createRemoteOptions(input));
        }),
    ],
    [
        'perplexity-native',
        createAdapter('perplexity-native', (input) => {
            return createPerplexity(createRemoteOptions(input));
        }),
    ],
    [
        'cohere-native',
        createAdapter('cohere-native', (input) => {
            return createCohere(createRemoteOptions(input));
        }),
    ],
    [
        'huggingface-native',
        createAdapter('huggingface-native', (input) => {
            return createHuggingFace(createRemoteOptions(input));
        }),
    ],
    [
        'ollama-local',
        createAdapter('ollama-local', (input) => {
            return createOllama(input.baseURL?.trim() ? { baseURL: input.baseURL.trim() } : {});
        }),
    ],
    [
        'openai-compatible',
        createAdapter('openai-compatible', (input) => {
            return createOpenAICompatible({
                name: input.displayName,
                baseURL: input.baseURL ?? 'http://localhost:1234/v1',
                ...(input.apiKey?.trim() ? { apiKey: input.apiKey.trim() } : {}),
            });
        }),
    ],
    [
        'gateway-compatible',
        createAdapter('gateway-compatible', (input) => {
            return createOpenAICompatible({
                name: input.displayName,
                baseURL: input.baseURL ?? '',
                ...(input.apiKey?.trim() ? { apiKey: input.apiKey.trim() } : {}),
            });
        }),
    ],
]);

// Returns one reviewed adapter without allowing dynamic imports or fallback factories.
export function getProviderAdapter(key: string): ProviderAdapterV1 | undefined {
    return PROVIDER_ADAPTERS.get(key);
}
