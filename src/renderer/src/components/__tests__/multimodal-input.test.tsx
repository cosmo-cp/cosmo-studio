import { StoreProvider } from '@/app/store-provider';
import { MultimodalInput } from '@/components/multimodal-input';
import { TooltipProvider } from '@/components/ui/tooltip';
import { PARALLEL_WEB_SEARCH_PROVIDER_ID, WEB_SEARCH_NONE_OPTION_ID } from '@/lib/web-search-options';
import { createMockAppDataSource } from '@/test/mock-app-data-source';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UIMessage } from 'ai';
import { ModelProviderTypeEnum, ModelStatusEnum } from 'core/database/schema/modelProviderSchema';
import { WebSearchProviderTypeEnum } from 'core/database/schema/webSearchConfigSchema';
import type { Chat, Persona, ProviderWithModels } from 'core/dto';
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

    it('shows web search choices from the Redux-backed data source and reports selection changes', async () => {
        const user = userEvent.setup();
        const onWebSearchChange = vi.fn();
        const sendMessage = vi.fn(async () => undefined);
        const options = [
            {
                id: WEB_SEARCH_NONE_OPTION_ID,
                label: 'No web search',
            },
            {
                id: WebSearchProviderTypeEnum.EXA,
                label: 'Exa web search',
            },
            {
                id: PARALLEL_WEB_SEARCH_PROVIDER_ID,
                label: 'Parallel web search',
            },
        ];

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
                            listOptions: async () => options,
                        },
                    })}
                >
                    <MultimodalInput
                        chat={buildChat()}
                        messages={[] as UIMessage[]}
                        status="ready"
                        sendMessage={sendMessage}
                        onModelChange={vi.fn()}
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
        expect(await screen.findByRole('option', { name: /no web search/i })).toBeInTheDocument();

        await user.click(screen.getByRole('option', { name: /parallel web search/i }));
        expect(onWebSearchChange).toHaveBeenCalledWith(PARALLEL_WEB_SEARCH_PROVIDER_ID);
    });
});
