import { StoreProvider } from '@/app/store-provider';
import { MultimodalInput } from '@/components/multimodal-input';
import { TooltipProvider } from '@/components/ui/tooltip';
import { WEB_SEARCH_NONE_OPTION_ID } from '@/lib/web-search-options';
import { createMockAppDataSource } from '@/test/mock-app-data-source';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UIMessage } from 'ai';
import { ModelProviderTypeEnum, ModelStatusEnum } from 'core/database/schema/modelProviderSchema';
import { WebSearchProviderTypeEnum } from 'core/database/schema/webSearchConfigSchema';
import type { Chat, Persona, ProviderWithModels, WebSearchConfigView } from 'core/dto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

class ResizeObserverMock {
    observe() {}

    unobserve() {}

    disconnect() {}
}

function buildChat(overrides: Partial<Chat> = {}): Chat {
    return {
        id: 'chat-1',
        createdAt: new Date('2026-03-18T00:00:00.000Z'),
        title: 'Chat 1',
        pinned: false,
        pinnedAt: null,
        selectedProvider: 'Primary Provider',
        selectedModelId: 'model-a',
        selectedPersonaId: null,
        selectedAgentId: null,
        selectedRuntime: 'model',
        selected: true,
        lastMessage: null,
        lastMessageAt: null,
        ...overrides,
    };
}

function buildProvider(): ProviderWithModels {
    return {
        id: 'provider-1',
        createdAt: new Date('2026-03-18T00:00:00.000Z'),
        updatedAt: null,
        type: ModelProviderTypeEnum.OPENAI,
        name: 'Primary Provider',
        apiKey: 'secret',
        apiUrl: null,
        models: [
            {
                id: 'model-1',
                createdAt: new Date('2026-03-18T00:00:00.000Z'),
                updatedAt: null,
                name: 'Model A',
                modelId: 'model-a',
                description: null,
                reasoning: false,
                attachment: false,
                toolCall: true,
                status: ModelStatusEnum.NOT_DEFINED,
                inputModalities: [],
                outputModalities: [],
                releaseDate: null,
                lastUpdatedByProvider: null,
                contextWindow: null,
                maxOutputWindow: null,
            },
        ],
    };
}

function buildPersona(): Persona {
    return {
        id: 'persona-1',
        name: 'Research Assistant',
        details: 'Focus on structured analysis.',
        createdAt: new Date('2026-03-18T00:00:00.000Z'),
        updatedAt: new Date('2026-03-18T00:00:00.000Z'),
    };
}

describe('MultimodalInput', () => {
    beforeEach(() => {
        vi.stubGlobal('ResizeObserver', ResizeObserverMock);
        HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
        HTMLElement.prototype.setPointerCapture = vi.fn();
        HTMLElement.prototype.releasePointerCapture = vi.fn();
        HTMLElement.prototype.scrollIntoView = vi.fn();
    });

    it('shows web search choices from the shared app data source and reports selection changes', async () => {
        const user = userEvent.setup();
        const onWebSearchChange = vi.fn();
        const sendMessage = vi.fn(async () => undefined);
        const exaConfig: WebSearchConfigView = {
            id: 'exa-config-1',
            createdAt: new Date('2026-03-18T00:00:00.000Z'),
            updatedAt: new Date('2026-03-18T01:00:00.000Z'),
            type: WebSearchProviderTypeEnum.EXA,
            enabled: true,
            hasApiKey: true,
        };

        render(
            <TooltipProvider>
                <StoreProvider
                    appDataSource={createMockAppDataSource({
                        modelProvider: {
                            getProvidersWithModels: async () => [buildProvider()],
                        },
                        persona: {
                            getAll: async () => [buildPersona()],
                        },
                        webSearch: {
                            getConfig: async () => exaConfig,
                        },
                    })}
                >
                    <MultimodalInput
                        chat={buildChat()}
                        messages={[] as UIMessage[]}
                        status="ready"
                        sendMessage={sendMessage}
                        onModelChange={vi.fn()}
                        onAgentChange={vi.fn()}
                        onPersonaChange={vi.fn()}
                        onWebSearchChange={onWebSearchChange}
                        selectedWebSearchOptionId={WEB_SEARCH_NONE_OPTION_ID}
                    />
                </StoreProvider>
            </TooltipProvider>,
        );

        await waitFor(() => {
            expect(screen.getByRole('combobox', { name: /web search/i })).toBeInTheDocument();
        });

        await user.click(screen.getByRole('combobox', { name: /web search/i }));
        expect(await screen.findByRole('option', { name: /disabled/i })).toBeInTheDocument();

        await user.click(screen.getByRole('option', { name: /exa web search/i }));
        expect(onWebSearchChange).toHaveBeenCalledWith(WebSearchProviderTypeEnum.EXA);
    });

    it('shows the persona selector as @ when personas are available', async () => {
        const user = userEvent.setup();
        const onPersonaChange = vi.fn();

        render(
            <TooltipProvider>
                <StoreProvider
                    appDataSource={createMockAppDataSource({
                        modelProvider: {
                            getProvidersWithModels: async () => [buildProvider()],
                        },
                        persona: {
                            getAll: async () => [buildPersona()],
                        },
                    })}
                >
                    <MultimodalInput
                        chat={buildChat()}
                        messages={[] as UIMessage[]}
                        status="ready"
                        sendMessage={vi.fn(async () => undefined)}
                        onModelChange={vi.fn()}
                        onAgentChange={vi.fn()}
                        onPersonaChange={onPersonaChange}
                        onWebSearchChange={vi.fn()}
                        selectedWebSearchOptionId={WEB_SEARCH_NONE_OPTION_ID}
                    />
                </StoreProvider>
            </TooltipProvider>,
        );

        const personaTrigger = await screen.findByRole('button', { name: /persona/i });
        expect(personaTrigger).toHaveTextContent('@');

        await user.click(personaTrigger);
        await user.click(await screen.findByRole('menuitemradio', { name: /research assistant/i }));

        expect(onPersonaChange).toHaveBeenCalledWith('persona-1');
    });

    it('shows the selected persona name instead of @ when a persona is active', async () => {
        render(
            <TooltipProvider>
                <StoreProvider
                    appDataSource={createMockAppDataSource({
                        modelProvider: {
                            getProvidersWithModels: async () => [buildProvider()],
                        },
                        persona: {
                            getAll: async () => [buildPersona()],
                        },
                    })}
                >
                    <MultimodalInput
                        chat={buildChat({
                            selectedPersonaId: 'persona-1',
                        })}
                        messages={[] as UIMessage[]}
                        status="ready"
                        sendMessage={vi.fn(async () => undefined)}
                        onModelChange={vi.fn()}
                        onAgentChange={vi.fn()}
                        onPersonaChange={vi.fn()}
                        onWebSearchChange={vi.fn()}
                        selectedWebSearchOptionId={WEB_SEARCH_NONE_OPTION_ID}
                    />
                </StoreProvider>
            </TooltipProvider>,
        );

        const personaTrigger = await screen.findByRole('button', { name: /persona/i });
        expect(personaTrigger).toHaveTextContent('Research Assistant');
        expect(personaTrigger).not.toHaveTextContent(/^@$/);
    });

    it('hides the persona selector when no personas exist and leaves @ input untouched', async () => {
        const user = userEvent.setup();
        const sendMessage = vi.fn(async () => undefined);

        render(
            <TooltipProvider>
                <StoreProvider
                    appDataSource={createMockAppDataSource({
                        modelProvider: {
                            getProvidersWithModels: async () => [buildProvider()],
                        },
                    })}
                >
                    <MultimodalInput
                        chat={buildChat()}
                        messages={[] as UIMessage[]}
                        status="ready"
                        sendMessage={sendMessage}
                        onModelChange={vi.fn()}
                        onAgentChange={vi.fn()}
                        onPersonaChange={vi.fn()}
                        onWebSearchChange={vi.fn()}
                        selectedWebSearchOptionId={WEB_SEARCH_NONE_OPTION_ID}
                    />
                </StoreProvider>
            </TooltipProvider>,
        );

        await waitFor(() => {
            expect(screen.queryByRole('combobox', { name: /persona/i })).not.toBeInTheDocument();
        });

        await user.type(screen.getByRole('textbox'), '@research');
        await user.click(screen.getByRole('button', { name: /submit/i }));

        await waitFor(() => {
            expect(sendMessage).toHaveBeenCalledWith(
                {
                    text: '@research',
                    files: [],
                },
                {
                    metadata: {
                        modelId: 'Primary Provider:model-a',
                        runtime: 'model',
                        agentId: null,
                        agentCwd: null,
                        personaId: null,
                        webSearchOptionId: null,
                    },
                },
            );
        });
    });

    it('hides agent controls and falls back to model submission when configured', async () => {
        const user = userEvent.setup();
        const sendMessage = vi.fn(async () => undefined);

        render(
            <TooltipProvider>
                <StoreProvider
                    appDataSource={createMockAppDataSource({
                        modelProvider: {
                            getProvidersWithModels: async () => [buildProvider()],
                        },
                        persona: {
                            getAll: async () => [buildPersona()],
                        },
                    })}
                >
                    <MultimodalInput
                        chat={buildChat({
                            selectedAgentId: 'agent-1',
                            selectedRuntime: 'agent',
                        })}
                        hideAgentControls
                        messages={[] as UIMessage[]}
                        status="ready"
                        sendMessage={sendMessage}
                        onModelChange={vi.fn()}
                        onAgentChange={vi.fn()}
                        onPersonaChange={vi.fn()}
                        onWebSearchChange={vi.fn()}
                        selectedWebSearchOptionId={WEB_SEARCH_NONE_OPTION_ID}
                    />
                </StoreProvider>
            </TooltipProvider>,
        );

        await waitFor(() => {
            expect(screen.queryByRole('button', { name: 'Agent' })).not.toBeInTheDocument();
            expect(screen.queryByLabelText(/agent workspace/i)).not.toBeInTheDocument();
        });

        await user.type(screen.getByRole('textbox'), 'Use the model runtime');
        await user.click(screen.getByRole('button', { name: /submit/i }));

        await waitFor(() => {
            expect(sendMessage).toHaveBeenCalledWith(
                {
                    text: 'Use the model runtime',
                    files: [],
                },
                {
                    metadata: {
                        modelId: 'Primary Provider:model-a',
                        runtime: 'model',
                        agentId: null,
                        agentCwd: null,
                        personaId: null,
                        webSearchOptionId: null,
                    },
                },
            );
        });
    });

    it('hides web search controls and submits without web search metadata when configured', async () => {
        const user = userEvent.setup();
        const sendMessage = vi.fn(async () => undefined);
        const exaConfig: WebSearchConfigView = {
            id: 'exa-config-1',
            createdAt: new Date('2026-03-18T00:00:00.000Z'),
            updatedAt: new Date('2026-03-18T01:00:00.000Z'),
            type: WebSearchProviderTypeEnum.EXA,
            enabled: true,
            hasApiKey: true,
        };

        render(
            <TooltipProvider>
                <StoreProvider
                    appDataSource={createMockAppDataSource({
                        modelProvider: {
                            getProvidersWithModels: async () => [buildProvider()],
                        },
                        persona: {
                            getAll: async () => [buildPersona()],
                        },
                        webSearch: {
                            getConfig: async () => exaConfig,
                        },
                    })}
                >
                    <MultimodalInput
                        chat={buildChat()}
                        hideWebSearchControls
                        messages={[] as UIMessage[]}
                        status="ready"
                        sendMessage={sendMessage}
                        onModelChange={vi.fn()}
                        onAgentChange={vi.fn()}
                        onPersonaChange={vi.fn()}
                        onWebSearchChange={vi.fn()}
                        selectedWebSearchOptionId={WebSearchProviderTypeEnum.EXA}
                    />
                </StoreProvider>
            </TooltipProvider>,
        );

        await waitFor(() => {
            expect(screen.queryByRole('combobox', { name: /web search/i })).not.toBeInTheDocument();
        });

        await user.type(screen.getByRole('textbox'), 'Do not use web search');
        await user.click(screen.getByRole('button', { name: /submit/i }));

        await waitFor(() => {
            expect(sendMessage).toHaveBeenCalledWith(
                {
                    text: 'Do not use web search',
                    files: [],
                },
                {
                    metadata: {
                        modelId: 'Primary Provider:model-a',
                        runtime: 'model',
                        agentId: null,
                        agentCwd: null,
                        personaId: null,
                        webSearchOptionId: null,
                    },
                },
            );
        });
    });
});
