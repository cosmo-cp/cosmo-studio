import { normalizeString } from './heuristic';

export interface PatternEvaluationResult {
    score: number;
    passed: boolean;
    reason?: string;
    matchedPattern?: RegExp;
}

/**
 * Evaluates an input string against regular expression patterns.
 */
export function evaluatePattern(input: string, patterns: RegExp[], threshold = 0.5): PatternEvaluationResult {
    const normalizedInput = normalizeString(input);
    let matchedPattern: RegExp | undefined;

    for (const pattern of patterns) {
        if (pattern.test(input) || pattern.test(normalizedInput)) {
            matchedPattern = pattern;
            break;
        }
    }

    const score = matchedPattern ? 1 : 0;
    const passed = score < threshold;

    return {
        score: score,
        passed: passed,
        reason: passed ? 'No pattern match detected' : `Matched prohibited pattern: ${matchedPattern?.source}`,
        matchedPattern: matchedPattern,
    };
}
