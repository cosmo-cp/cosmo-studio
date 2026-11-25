import type { Guard, GuardResult, LLMEngineMessage, SecretGuardOptions } from '../types';

export interface SecretPatternRule {
    id: string;
    name: string;
    pattern: RegExp;
    replacement: string;
}

export const SECRET_PATTERN_REGISTRY: SecretPatternRule[] = [
    {
        id: 'aws-access-key',
        name: 'AWS Access Key',
        pattern: /\b((?:A3T[A-Z0-9]|AKIA|ASIA|ABIA|ACCA)[A-Z0-9]{16})\b/g,
        replacement: '[REDACTED-AWS-KEY]',
    },
    {
        id: 'github-pat',
        name: 'GitHub Personal Access Token',
        pattern: /\bghp_[0-9a-zA-Z]{36}\b/g,
        replacement: '[REDACTED-GITHUB-PAT]',
    },
    {
        id: 'github-fine-grained-pat',
        name: 'GitHub Fine-Grained Token',
        pattern: /\bgithub_pat_\w{82}\b/g,
        replacement: '[REDACTED-GITHUB-TOKEN]',
    },
    {
        id: 'github-oauth',
        name: 'GitHub OAuth Access Token',
        pattern: /\bgho_[0-9a-zA-Z]{36}\b/g,
        replacement: '[REDACTED-GITHUB-OAUTH]',
    },
    {
        id: 'github-app-token',
        name: 'GitHub App Token',
        pattern: /\b(?:ghu|ghs)_[0-9a-zA-Z]{36}\b/g,
        replacement: '[REDACTED-GITHUB-APP-TOKEN]',
    },
    {
        id: 'openai-api-key',
        name: 'OpenAI API Key',
        pattern: /\bsk-(?:proj-)?[a-zA-Z0-9_-]{32,}\b/g,
        replacement: '[REDACTED-OPENAI-KEY]',
    },
    {
        id: 'slack-token',
        name: 'Slack Token',
        pattern: /\bxox[baprs]-[0-9a-zA-Z]{10,48}\b/g,
        replacement: '[REDACTED-SLACK-TOKEN]',
    },
    {
        id: '1password-token',
        name: '1Password Token',
        pattern: /\bops_eyJ[a-zA-Z0-9+/]{20,}={0,3}\b/g,
        replacement: '[REDACTED-1PASSWORD-TOKEN]',
    },
    {
        id: 'private-key',
        name: 'Private Key',
        pattern:
            /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----[^-]+-----END (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,
        replacement: '[REDACTED-PRIVATE-KEY]',
    },
    {
        id: 'generic-api-key',
        name: 'Generic API Key',
        pattern: /(?:api[_-]?key|secret[_-]?key|access[_-]?token)[\s:=]+['"][a-zA-Z0-9_-]{20,}['"]/gi,
        replacement: '[REDACTED-API-KEY]',
    },
];

export function redactSecretsText(text: string, rules: SecretPatternRule[] = SECRET_PATTERN_REGISTRY): string {
    let result = text;
    for (const rule of rules) {
        const reg = new RegExp(rule.pattern.source, rule.pattern.flags);
        result = result.replace(reg, rule.replacement);
    }
    return result;
}

export function secretGuard(opts: SecretGuardOptions = {}): Guard {
    const targetRoles = opts.roles ?? ['user', 'human', 'assistant'];
    const mode = opts.mode ?? 'block';

    return async (messages: LLMEngineMessage[]): Promise<GuardResult[]> => {
        const results: GuardResult[] = [];

        for (const msg of messages) {
            const role = msg.originalMessage.role?.toLowerCase() ?? 'user';
            const inScope = targetRoles.includes(role);

            if (!inScope) {
                results.push({
                    guardId: 'secret',
                    guardName: 'Secret Guard',
                    passed: true,
                    reason: 'Message role not in scope',
                });
                continue;
            }

            const input = msg.originalMessage.content;
            let detected = false;
            const detectedTypes: string[] = [];

            for (const rule of SECRET_PATTERN_REGISTRY) {
                const reg = new RegExp(rule.pattern.source, rule.pattern.flags);
                if (reg.test(input)) {
                    detected = true;
                    detectedTypes.push(rule.name);
                }
            }

            if (!detected) {
                results.push({
                    guardId: 'secret',
                    guardName: 'Secret Guard',
                    passed: true,
                    reason: 'No secret detected',
                });
                continue;
            }

            if (mode === 'block') {
                results.push({
                    guardId: 'secret',
                    guardName: 'Secret Guard',
                    passed: false,
                    reason: `Secret detected (${detectedTypes.join(', ')})`,
                });
            } else {
                const redacted = redactSecretsText(input);
                results.push({
                    guardId: 'secret',
                    guardName: 'Secret Guard',
                    passed: true,
                    reason: `Secret redacted (${detectedTypes.join(', ')})`,
                    modifiedMessage: {
                        ...msg.originalMessage,
                        content: redacted,
                    },
                });
            }
        }

        return results;
    };
}
