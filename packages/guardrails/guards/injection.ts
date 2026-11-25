import { evaluateHeuristic } from '../tactics/heuristic';
import { evaluatePattern } from '../tactics/pattern';
import type { Guard, GuardBaseOptions, GuardResult, LLMEngineMessage } from '../types';

function generateInjectionKeywords(): string[] {
    const verbs = [
        'Ignore',
        'Disregard',
        'Skip',
        'Forget',
        'Neglect',
        'Overlook',
        'Omit',
        'Bypass',
        'Pay no attention to',
        'Do not follow',
        'Do not obey',
    ];
    const adjectives = ['', 'prior', 'previous', 'preceding', 'above', 'foregoing', 'earlier', 'initial'];
    const prepositions = ['', 'and start over', 'and start anew', 'and begin afresh', 'and start from scratch'];
    const objects = [
        'content',
        'text',
        'instructions',
        'instruction',
        'directives',
        'directive',
        'commands',
        'command',
        'context',
        'conversation',
        'input',
        'inputs',
        'data',
        'message',
        'messages',
        'communication',
        'response',
        'responses',
        'request',
        'requests',
    ];

    const injectionKeywords: string[] = [];
    for (const verb of verbs) {
        for (const adjective of adjectives) {
            for (const object of objects) {
                for (const preposition of prepositions) {
                    injectionKeywords.push(`${verb} ${adjective} ${object} ${preposition}`.trim());
                }
            }
        }
    }
    return injectionKeywords;
}

export const InjectionKeywords: string[] = generateInjectionKeywords();

export const InjectionPatterns: RegExp[] = [
    /ignore (all )?(previous|earlier|above) (instructions|context|messages)/i,
    /disregard (all )?(previous|earlier|above) (instructions|context|messages)/i,
    /as an? (ai|assistant|language model)/i,
    /repeat after me/i,
    /you are now/i,
    /act as/i,
    /pretend to be/i,
    /jailbreak/i,
    /system:/i,
    /assistant:/i,
    /user:/i,
    /write (a )?prompt/i,
    /bypass/i,
    /unfiltered/i,
    /do anything/i,
    /simulate/i,
    /roleplay/i,
    /developer mode/i,
    /[“"']?ignore[”"']? this/i,
];

export interface InjectionGuardExtra {
    mode?: 'heuristic' | 'pattern';
    threshold?: number;
}

export function injectionGuard(opts: GuardBaseOptions = {}, extra: InjectionGuardExtra = {}): Guard {
    const targetRoles = opts.roles ?? ['user', 'human'];
    const mode = extra.mode ?? 'heuristic';
    const threshold = extra.threshold ?? 0.7;

    return async (messages: LLMEngineMessage[]): Promise<GuardResult[]> => {
        const results: GuardResult[] = [];

        for (const msg of messages) {
            const role = msg.originalMessage.role?.toLowerCase() ?? 'user';
            const inScope = targetRoles.includes(role);

            if (!inScope) {
                results.push({
                    guardId: 'injection',
                    guardName: 'Injection Guard',
                    passed: true,
                    reason: 'Message role not in scope',
                });
                continue;
            }

            const input = msg.originalMessage.content;
            const evalResult =
                mode === 'pattern'
                    ? evaluatePattern(input, InjectionPatterns, threshold)
                    : evaluateHeuristic(input, InjectionKeywords, threshold);

            results.push({
                guardId: 'injection',
                guardName: 'Injection Guard',
                passed: evalResult.passed,
                reason: evalResult.reason,
            });
        }

        return results;
    };
}
