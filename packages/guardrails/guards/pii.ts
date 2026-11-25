import type { Guard, GuardResult, LLMEngineMessage, PiiGuardOptions } from '../types';

export interface PIIRegexRule {
    id: string;
    name: string;
    regex: RegExp;
    replacement: string;
}

export const PII_REGEX_REGISTRY: PIIRegexRule[] = [
    {
        id: 'email',
        name: 'Email',
        regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
        replacement: '[REDACTED-EMAIL]',
    },
    {
        id: 'phone',
        name: 'Phone',
        regex: /\b(?:\+?\d{1,3}[-. ]?)?\(?\d{3}\)?[-. ]?\d{3}[-. ]?\d{4}\b/g,
        replacement: '[REDACTED-PHONE]',
    },
    {
        id: 'ssn',
        name: 'SSN',
        regex: /\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/g,
        replacement: '[REDACTED-SSN]',
    },
    {
        id: 'credit-card',
        name: 'Credit Card',
        regex: /\b(?:\d{4}[- ]?){3}\d{4}\b/g,
        replacement: '[REDACTED-CREDIT-CARD]',
    },
    {
        id: 'ip-address',
        name: 'IP Address',
        regex: /\b(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
        replacement: '[REDACTED-IP-ADDRESS]',
    },
    {
        id: 'icd10',
        name: 'ICD-10 Code',
        regex: /\b[A-TV-Z][0-9]{2}(?:\.[0-9A-TV-Z]{1,4})?\b/g,
        replacement: '[REDACTED-ICD10]',
    },
    {
        id: 'mrn',
        name: 'Medical Record Number',
        regex: /\b(?:MR|MRN|MEDICAL\s*RECORD)[-:\s]*[A-Z0-9]{6,12}\b/gi,
        replacement: '[REDACTED-MRN]',
    },
    {
        id: 'npi',
        name: 'NPI Number',
        regex: /\bNPI[-:\s]*[0-9]{10}\b/gi,
        replacement: '[REDACTED-NPI]',
    },
    {
        id: 'dea',
        name: 'DEA Number',
        regex: /\bDEA[-:\s]*[A-Z]{2}[0-9]{7}\b/gi,
        replacement: '[REDACTED-DEA]',
    },
];

export function redactPiiText(text: string, rules: PIIRegexRule[] = PII_REGEX_REGISTRY): string {
    let result = text;
    for (const rule of rules) {
        // Create fresh RegExp to avoid lastIndex state issues with global flag
        const reg = new RegExp(rule.regex.source, rule.regex.flags);
        result = result.replace(reg, rule.replacement);
    }
    return result;
}

export function piiGuard(opts: PiiGuardOptions = {}): Guard {
    const targetRoles = opts.roles ?? ['user', 'human', 'assistant'];
    const mode = opts.mode ?? 'redact';

    return async (messages: LLMEngineMessage[]): Promise<GuardResult[]> => {
        const results: GuardResult[] = [];

        for (const msg of messages) {
            const role = msg.originalMessage.role?.toLowerCase() ?? 'user';
            const inScope = targetRoles.includes(role);

            if (!inScope) {
                results.push({
                    guardId: 'pii',
                    guardName: 'PII Guard',
                    passed: true,
                    reason: 'Message role not in scope',
                });
                continue;
            }

            const input = msg.originalMessage.content;
            let detected = false;
            const detectedTypes: string[] = [];

            for (const rule of PII_REGEX_REGISTRY) {
                const reg = new RegExp(rule.regex.source, rule.regex.flags);
                if (reg.test(input)) {
                    detected = true;
                    detectedTypes.push(rule.name);
                }
            }

            if (!detected) {
                results.push({
                    guardId: 'pii',
                    guardName: 'PII Guard',
                    passed: true,
                    reason: 'No PII detected',
                });
                continue;
            }

            if (mode === 'block') {
                results.push({
                    guardId: 'pii',
                    guardName: 'PII Guard',
                    passed: false,
                    reason: `PII detected (${detectedTypes.join(', ')})`,
                });
            } else {
                const redacted = redactPiiText(input);
                results.push({
                    guardId: 'pii',
                    guardName: 'PII Guard',
                    passed: true,
                    reason: `PII redacted (${detectedTypes.join(', ')})`,
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
