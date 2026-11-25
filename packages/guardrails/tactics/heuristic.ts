/**
 * Normalizes text for heuristic comparison by lowercasing,
 * stripping non-word characters and condensing whitespace.
 */
export function normalizeString(str: string): string {
    return str
        .toLowerCase()
        .replace(/[^\w\s]|_/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Computes the Sørensen-Dice coefficient between two strings based on character bigrams.
 */
export function compareBigrams(first: string, second: string): number {
    const a = first.replace(/\s+/g, '');
    const b = second.replace(/\s+/g, '');
    if (a === b) return 1;
    if (a.length < 2 || b.length < 2) return 0;

    const firstBigrams = new Map<string, number>();
    for (let i = 0; i < a.length - 1; i++) {
        const bigram = a.substring(i, i + 2);
        firstBigrams.set(bigram, (firstBigrams.get(bigram) || 0) + 1);
    }

    let intersectionSize = 0;
    for (let i = 0; i < b.length - 1; i++) {
        const bigram = b.substring(i, i + 2);
        const count = firstBigrams.get(bigram) || 0;
        if (count > 0) {
            firstBigrams.set(bigram, count - 1);
            intersectionSize++;
        }
    }

    return (2 * intersectionSize) / (a.length + b.length - 2);
}

export interface HeuristicEvaluationResult {
    score: number;
    passed: boolean;
    reason?: string;
    bestKeyword?: string;
    bestSubstring?: string;
}

/**
 * Evaluates an input string against a set of keywords using sliding-window token overlap
 * and bigram similarity matching (in-process).
 */
export function evaluateHeuristic(input: string, keywords: string[], threshold: number): HeuristicEvaluationResult {
    const normalizedInput = normalizeString(input);
    if (!normalizedInput) {
        return { score: 0, passed: true, reason: 'No content to evaluate' };
    }

    const inputTokens = normalizedInput.split(' ');
    let highestScore = 0;
    let bestKeyword = '';
    let bestSubstring = '';

    for (const keyword of keywords) {
        const normalizedKeyword = normalizeString(keyword);
        const keywordTokens = normalizedKeyword.split(' ');
        const n = keywordTokens.length;

        for (let i = 0; i <= inputTokens.length - n; i++) {
            const tokens = inputTokens.slice(i, i + n);
            const candidate = tokens.join(' ');
            const similarityScore = compareBigrams(normalizedKeyword, candidate);

            let matchedWordsCount = 0;
            for (let j = 0; j < n; j++) {
                if (tokens[j] === keywordTokens[j]) {
                    matchedWordsCount++;
                }
            }

            const maxMatchedWords = 5;
            const baseScore = matchedWordsCount > 0 ? 0.5 + 0.5 * Math.min(matchedWordsCount / maxMatchedWords, 1) : 0;
            const adjustedScore = baseScore + similarityScore * (1 / (maxMatchedWords * 2));

            if (adjustedScore > highestScore) {
                highestScore = adjustedScore;
                bestKeyword = keyword;
                bestSubstring = candidate;
            }
        }
    }

    const passed = highestScore < threshold;
    return {
        score: highestScore,
        passed: passed,
        reason: passed
            ? 'No violation detected'
            : `Fuzzy similarity score (${highestScore.toFixed(2)}) exceeded threshold (${threshold}) for pattern "${bestKeyword}"`,
        bestKeyword: bestKeyword,
        bestSubstring: bestSubstring,
    };
}
