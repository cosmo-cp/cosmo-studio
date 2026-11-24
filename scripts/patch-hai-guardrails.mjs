import fs from 'node:fs';
import path from 'node:path';

const files = [
    'node_modules/@presidio-dev/hai-guardrails/dist/index.js',
    'node_modules/@presidio-dev/hai-guardrails/dist/index.cjs',
    'node_modules/@presidio-dev/hai-guardrails/dist/workers/heuristic.worker.js',
    'node_modules/@presidio-dev/hai-guardrails/dist/workers/heuristic.worker.cjs',
];

const inProcessWorkerCode = `
function __calcHeuristicScore(input, keyword, threshold = 0.8) {
  function _normalize(str) {
    return str.toLowerCase().replace(/[^\\w\\s]|_/g, "").replace(/\\s+/g, " ").trim();
  }
  function _compare(first, second) {
    first = first.replace(/\\s+/g, "");
    second = second.replace(/\\s+/g, "");
    if (first === second) return 1;
    if (first.length < 2 || second.length < 2) return 0;
    const firstBigrams = new Map();
    for (let i = 0; i < first.length - 1; i++) {
      const bigram = first.substring(i, i + 2);
      firstBigrams.set(bigram, (firstBigrams.get(bigram) || 0) + 1);
    }
    let intersectionSize = 0;
    for (let i = 0; i < second.length - 1; i++) {
      const bigram = second.substring(i, i + 2);
      const count = firstBigrams.get(bigram) || 0;
      if (count > 0) {
        firstBigrams.set(bigram, count - 1);
        intersectionSize++;
      }
    }
    return (2 * intersectionSize) / (first.length + second.length - 2);
  }

  const inputTokens = _normalize(input).split(" ");
  const normalizedKeyword = _normalize(keyword);
  const keywordTokens = normalizedKeyword.split(" ");
  const n = keywordTokens.length;
  let highestScore = 0;
  let bestSubstring = "";
  for (let i = 0; i <= inputTokens.length - n; i++) {
    const tokens = inputTokens.slice(i, i + n);
    const candidate = tokens.join(" ");
    const similarityScore = _compare(normalizedKeyword, candidate);
    let matchedWordsCount = 0;
    for (let j = 0; j < n; j++) {
      if (tokens[j] === keywordTokens[j]) matchedWordsCount++;
    }
    const maxMatchedWords = 5;
    const baseScore = matchedWordsCount > 0 ? 0.5 + 0.5 * Math.min(matchedWordsCount / maxMatchedWords, 1) : 0;
    const adjustedScore = baseScore + similarityScore * (1 / (maxMatchedWords * 2));
    if (adjustedScore > highestScore) {
      highestScore = adjustedScore;
      bestSubstring = candidate;
    }
  }
  return {
    score: highestScore,
    additionalFields: {
      bestKeyword: keyword,
      bestSubstring,
      threshold,
      isInjection: highestScore >= threshold
    }
  };
}
`;

function patch() {
    for (const file of files) {
        const filePath = path.resolve(process.cwd(), file);
        if (!fs.existsSync(filePath)) continue;

        let content = fs.readFileSync(filePath, 'utf8');
        const originalContent = content;

        // Fix CJS and Vite bundling import.meta.url errors
        content = content.replace(
            /createRequire\s*\(\s*import\.meta\.url\s*\)/g,
            '(typeof require !== "undefined" ? require : /* @__PURE__ */ createRequire("file://" + (typeof __filename !== "undefined" ? __filename : process.cwd() + "/index.js")))',
        );

        content = content.replace(
            /import_url\.fileURLToPath\s*\(\s*import\.meta\.url\s*\)/g,
            '(typeof __filename !== "undefined" ? __filename : "")',
        );

        content = content.replace(
            /fileURLToPath\s*\(\s*import\.meta\.url\s*\)/g,
            '(typeof __filename !== "undefined" ? __filename : "")',
        );

        // Avoid broken piscina worker pool initialization
        if (!content.includes('__calcHeuristicScore')) {
            content = inProcessWorkerCode + '\n' + content;
            content = content.replace(
                /this\.piscina\s*=\s*new\s+[^;]+;/g,
                'this.piscina = { run: async ({ input, keyword, threshold }) => __calcHeuristicScore(input, keyword, threshold) };',
            );
        }

        if (content !== originalContent) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Patched ${file} successfully.`);
        }
    }
}

patch();
