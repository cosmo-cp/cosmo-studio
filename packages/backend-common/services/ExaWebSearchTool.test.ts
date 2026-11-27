import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createExaWebSearchTool } from './ExaWebSearchTool';

const ai = vi.hoisted(() => {
    return {
        tool: vi.fn((definition: unknown) => {
            return definition;
        }),
    };
});

vi.mock('ai', () => {
    return {
        tool: ai.tool,
    };
});

type ToolDefinition = {
    execute: (input: { query: string }) => Promise<unknown>;
};

describe('createExaWebSearchTool', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
    });

    it('creates an AI SDK tool that sends default Exa search options', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: vi.fn().mockResolvedValue({ results: [] }),
        });
        vi.stubGlobal('fetch', fetchMock);

        const tool = createExaWebSearchTool({ apiKey: 'exa-secret' }) as ToolDefinition;
        const result = await tool.execute({ query: 'latest docs' });

        expect(result).toEqual({ results: [] });
        expect(fetchMock).toHaveBeenCalledWith('https://api.exa.ai/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': 'exa-secret',
                'x-exa-integration': 'cosmo-studio-ai-sdk',
                'User-Agent': 'cosmo-studio-ai-sdk',
            },
            body: JSON.stringify({
                query: 'latest docs',
                type: 'auto',
                numResults: 10,
                contents: {
                    text: { maxCharacters: 3000 },
                    livecrawl: 'fallback',
                },
            }),
        });
    });

    it('passes configured search filters and content options to Exa', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: vi.fn().mockResolvedValue({ results: [{ title: 'Docs' }] }),
        });
        vi.stubGlobal('fetch', fetchMock);

        const tool = createExaWebSearchTool({
            apiKey: 'exa-secret',
            type: 'keyword',
            category: 'github',
            numResults: 3,
            includeDomains: ['github.com'],
            excludeDomains: [],
            contents: {
                text: false,
                summary: { query: 'summarize' },
                livecrawl: 'always',
                extras: { links: 2 },
            },
        }) as ToolDefinition;

        await tool.execute({ query: 'cosmo studio' });

        const request = fetchMock.mock.calls[0][1];
        expect(JSON.parse(request.body)).toEqual({
            query: 'cosmo studio',
            type: 'keyword',
            numResults: 3,
            category: 'github',
            includeDomains: ['github.com'],
            contents: {
                text: false,
                summary: { query: 'summarize' },
                livecrawl: 'always',
                extras: { links: 2 },
            },
        });
    });

    it('rejects missing API keys before calling Exa', async () => {
        const fetchMock = vi.fn();
        vi.stubEnv('EXA_API_KEY', '');
        vi.stubGlobal('fetch', fetchMock);

        const tool = createExaWebSearchTool() as ToolDefinition;

        await expect(tool.execute({ query: 'latest docs' })).rejects.toThrow('EXA_API_KEY is required');
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('includes Exa response details when the API rejects the request', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: false,
            status: 401,
            text: vi.fn().mockResolvedValue('unauthorized'),
        });
        vi.stubGlobal('fetch', fetchMock);

        const tool = createExaWebSearchTool({ apiKey: 'bad-key' }) as ToolDefinition;

        await expect(tool.execute({ query: 'latest docs' })).rejects.toThrow('Exa API error: 401 - unauthorized');
    });
});
