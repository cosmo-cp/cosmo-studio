import * as fs from 'fs/promises';
import * as path from 'path';

export const MODELS_API_URL = 'https://models.dev/api.json';
export const LOGO_API_URL = 'https://models.dev/logos';

export type FetchResponse = {
    ok: boolean;
    status: number;
    statusText: string;
    json(): Promise<unknown>;
    arrayBuffer(): Promise<ArrayBuffer>;
};

export type FetchFn = (input: string) => Promise<FetchResponse>;

export interface DownloadSummary {
    providers: string[];
    downloaded: Array<{ provider: string; filePath: string }>;
    failed: Array<{ provider: string; reason: string }>;
}

export interface DownloadProviderLogosOptions {
    outputDirectory: string;
    fetchFn?: FetchFn;
    logger?: Pick<Console, 'log' | 'warn' | 'error'>;
}

// Validates that the API payload is a JSON object so we can safely read top-level keys.
function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// Extracts provider names from models.dev and returns a deterministic sorted list.
export function extractUniqueProviderNames(payload: unknown): string[] {
    if (!isRecord(payload)) {
        throw new Error('Expected models.dev response to be a top-level JSON object.');
    }

    return [
        ...new Set(
            Object.keys(payload)
                .map((provider) => provider.trim())
                .filter(Boolean),
        ),
    ].sort((a, b) => a.localeCompare(b));
}

// Encodes provider names for safe use in the logo endpoint URL.
export function buildLogoUrl(provider: string): string {
    return `${LOGO_API_URL}/${encodeURIComponent(provider)}.svg`;
}

// Uses provider names as encoded filenames so every provider maps predictably to one file.
export function buildLogoFilename(provider: string): string {
    return `${encodeURIComponent(provider)}.svg`;
}

// Fetches provider data from models.dev and returns provider names.
export async function fetchProviderNames(fetchFn: FetchFn): Promise<string[]> {
    const response = await fetchFn(MODELS_API_URL);

    if (!response.ok) {
        throw new Error(`Failed to fetch providers (${response.status} ${response.statusText}) from ${MODELS_API_URL}`);
    }

    return extractUniqueProviderNames(await response.json());
}

// Downloads a single provider logo and returns the path of the saved image.
export async function downloadProviderLogo(
    fetchFn: FetchFn,
    provider: string,
    outputDirectory: string,
): Promise<string> {
    const response = await fetchFn(buildLogoUrl(provider));

    if (!response.ok) {
        throw new Error(`Logo request failed for "${provider}" (${response.status} ${response.statusText})`);
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    const outputPath = path.join(outputDirectory, buildLogoFilename(provider));
    await fs.writeFile(outputPath, bytes);

    return outputPath;
}

// Coordinates fetching provider names, printing them, and downloading each logo.
export async function downloadProviderLogos(options: DownloadProviderLogosOptions): Promise<DownloadSummary> {
    const fetchFn = options.fetchFn ?? (globalThis.fetch as unknown as FetchFn);
    const logger = options.logger ?? console;
    const outputDirectory = path.resolve(options.outputDirectory);

    if (typeof fetchFn !== 'function') {
        throw new Error('No fetch implementation found. Use Node.js v18+ or pass a custom fetchFn.');
    }

    await fs.mkdir(outputDirectory, { recursive: true });

    const providers = await fetchProviderNames(fetchFn);
    logger.log(`Found ${providers.length} unique providers:`);
    for (const provider of providers) {
        logger.log(provider);
    }

    const downloaded: Array<{ provider: string; filePath: string }> = [];
    const failed: Array<{ provider: string; reason: string }> = [];

    for (const provider of providers) {
        try {
            const filePath = await downloadProviderLogo(fetchFn, provider, outputDirectory);
            downloaded.push({ provider, filePath });
            logger.log(`Downloaded ${provider} -> ${filePath}`);
        } catch (error) {
            const reason = error instanceof Error ? error.message : String(error);
            failed.push({ provider, reason });
            logger.warn(`Failed to download ${provider}: ${reason}`);
        }
    }

    logger.log(
        `Finished logo download. Success: ${downloaded.length}. Failed: ${failed.length}. Output: ${outputDirectory}`,
    );

    return { providers, downloaded, failed };
}

// Provides a CLI entrypoint to run the logo downloader from npm scripts.
async function main(): Promise<void> {
    const outputDirectoryArg = process.argv[2];
    const outputDirectory = outputDirectoryArg
        ? path.resolve(process.cwd(), outputDirectoryArg)
        : path.resolve(process.cwd(), 'src/renderer/public/providers');
    const summary = await downloadProviderLogos({ outputDirectory });

    if (summary.failed.length > 0) {
        process.exitCode = 1;
    }
}

if (require.main === module) {
    main().catch((error) => {
        const reason = error instanceof Error ? error.message : String(error);
        console.error(reason);
        process.exitCode = 1;
    });
}
