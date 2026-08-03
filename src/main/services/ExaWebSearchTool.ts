import {tool} from "ai";
import {z} from "zod";

type ExaSearchType = "auto" | "keyword" | "neural" | "fast" | "deep";
type ExaSearchCategory =
    | "company"
    | "research paper"
    | "news"
    | "pdf"
    | "github"
    | "personal site"
    | "linkedin profile"
    | "financial report";

interface ExaTextOptions {
    maxCharacters?: number;
    includeHtmlTags?: boolean;
}

interface ExaHighlightsOptions {
    numSentences?: number;
    highlightsPerUrl?: number;
    query?: string;
}

interface ExaSummaryOptions {
    query?: string;
}

interface ExaContentsOptions {
    text?: boolean | ExaTextOptions;
    highlights?: boolean | ExaHighlightsOptions;
    summary?: boolean | ExaSummaryOptions;
    livecrawl?: "never" | "fallback" | "always" | "preferred";
    livecrawlTimeout?: number;
    subpages?: number;
    subpageTarget?: string | string[];
    extras?: {
        links?: number;
        imageLinks?: number;
    };
}

interface ExaWebSearchToolConfig {
    apiKey?: string;
    type?: ExaSearchType;
    category?: ExaSearchCategory;
    userLocation?: string;
    numResults?: number;
    includeDomains?: string[];
    excludeDomains?: string[];
    startCrawlDate?: string;
    endCrawlDate?: string;
    startPublishedDate?: string;
    endPublishedDate?: string;
    includeText?: string[];
    excludeText?: string[];
    contents?: ExaContentsOptions;
}

type ExaRequestBody = {
    query: string;
    type: ExaSearchType;
    numResults: number;
    contents: {
        text?: boolean | ExaTextOptions;
        highlights?: boolean | ExaHighlightsOptions;
        summary?: boolean | ExaSummaryOptions;
        livecrawl: "never" | "fallback" | "always" | "preferred";
        livecrawlTimeout?: number;
        subpages?: number;
        subpageTarget?: string | string[];
        extras?: {
            links?: number;
            imageLinks?: number;
        };
    };
    category?: ExaSearchCategory;
    userLocation?: string;
    includeDomains?: string[];
    excludeDomains?: string[];
    startCrawlDate?: string;
    endCrawlDate?: string;
    startPublishedDate?: string;
    endPublishedDate?: string;
    includeText?: string[];
    excludeText?: string[];
};

const DEFAULT_RESULT_COUNT = 10;
const DEFAULT_TEXT_CHARACTER_LIMIT = 3000;

// Keep the Exa tool local so the app can track AI SDK major versions without an incompatible adapter peer.
export function createExaWebSearchTool(config: ExaWebSearchToolConfig = {}) {
    const {
        apiKey = process.env.EXA_API_KEY,
        ...searchOptions
    } = config;

    return tool({
        description: "Search the web for current information, documentation, news, articles, and scraped page content.",
        inputSchema: z.object({
            query: z.string().min(1).max(500).describe("The web search query."),
        }),
        execute: async ({query}: {query: string}) => {
            if (!apiKey) {
                throw new Error("EXA_API_KEY is required. Set it in environment variables or pass it in config.");
            }

            const response = await fetch("https://api.exa.ai/search", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": apiKey,
                    "x-exa-integration": "cosmo-studio-ai-sdk",
                    "User-Agent": "cosmo-studio-ai-sdk",
                },
                body: JSON.stringify(buildExaRequestBody(query, searchOptions)),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Exa API error: ${response.status} - ${errorText}`);
            }

            return response.json();
        },
    });
}

// Normalize optional Exa fields so every tool call sends predictable defaults to the API.
function buildExaRequestBody(
    query: string,
    searchOptions: Omit<ExaWebSearchToolConfig, "apiKey">
): ExaRequestBody {
    const contents = searchOptions.contents ?? {};
    const requestBody: ExaRequestBody = {
        query,
        type: searchOptions.type ?? "auto",
        numResults: searchOptions.numResults ?? DEFAULT_RESULT_COUNT,
        contents: {
            text: contents.text ?? {maxCharacters: DEFAULT_TEXT_CHARACTER_LIMIT},
            livecrawl: contents.livecrawl ?? "fallback",
        },
    };

    copyDefinedSearchOptions(requestBody, searchOptions);

    if (contents.highlights !== undefined) {
        requestBody.contents.highlights = contents.highlights;
    }
    if (contents.summary !== undefined) {
        requestBody.contents.summary = contents.summary;
    }
    if (contents.livecrawlTimeout !== undefined) {
        requestBody.contents.livecrawlTimeout = contents.livecrawlTimeout;
    }
    if (contents.subpages !== undefined) {
        requestBody.contents.subpages = contents.subpages;
    }
    if (contents.subpageTarget !== undefined) {
        requestBody.contents.subpageTarget = contents.subpageTarget;
    }
    if (contents.extras !== undefined) {
        requestBody.contents.extras = contents.extras;
    }

    return requestBody;
}

// Avoid sending empty filters because Exa treats several filter arrays as meaningful constraints.
function copyDefinedSearchOptions(
    requestBody: ExaRequestBody,
    searchOptions: Omit<ExaWebSearchToolConfig, "apiKey">
) {
    if (searchOptions.category !== undefined) {
        requestBody.category = searchOptions.category;
    }
    if (searchOptions.userLocation !== undefined) {
        requestBody.userLocation = searchOptions.userLocation;
    }
    if (searchOptions.includeDomains?.length) {
        requestBody.includeDomains = searchOptions.includeDomains;
    }
    if (searchOptions.excludeDomains?.length) {
        requestBody.excludeDomains = searchOptions.excludeDomains;
    }
    if (searchOptions.startCrawlDate !== undefined) {
        requestBody.startCrawlDate = searchOptions.startCrawlDate;
    }
    if (searchOptions.endCrawlDate !== undefined) {
        requestBody.endCrawlDate = searchOptions.endCrawlDate;
    }
    if (searchOptions.startPublishedDate !== undefined) {
        requestBody.startPublishedDate = searchOptions.startPublishedDate;
    }
    if (searchOptions.endPublishedDate !== undefined) {
        requestBody.endPublishedDate = searchOptions.endPublishedDate;
    }
    if (searchOptions.includeText?.length) {
        requestBody.includeText = searchOptions.includeText;
    }
    if (searchOptions.excludeText?.length) {
        requestBody.excludeText = searchOptions.excludeText;
    }
}
