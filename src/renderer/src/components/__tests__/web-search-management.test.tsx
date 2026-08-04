import {render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {StoreProvider} from "@/app/store-provider";
import {createMockAppDataSource} from "@/test/mock-app-data-source";
import {WebSearchManagement} from "@/components/web-search-management";
import {WebSearchProviderTypeEnum} from "core/database/schema/webSearchConfigSchema";
import {PARALLEL_WEB_SEARCH_PROVIDER_ID} from "@/lib/web-search-options";

class ResizeObserverMock {
    observe() {
    }

    unobserve() {
    }

    disconnect() {
    }
}

describe("WebSearchManagement", () => {
    beforeEach(() => {
        vi.stubGlobal("ResizeObserver", ResizeObserverMock);
    });

    it("shows Exa and Parallel cards instead of the placeholder sections", async () => {
        render(
            <StoreProvider appDataSource={createMockAppDataSource()}>
                <WebSearchManagement />
            </StoreProvider>
        );

        expect(await screen.findByRole("heading", {name: /^web search$/i})).toBeInTheDocument();
        expect(screen.getByText(/exa web search/i)).toBeInTheDocument();
        expect(screen.getByText(/parallel web search/i)).toBeInTheDocument();
        expect(screen.queryByText(/default behavior/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/result handling/i)).not.toBeInTheDocument();
    });

    it("saves Exa settings from the dialog and updates the card state", async () => {
        const user = userEvent.setup();
        const saveConfig = vi.fn(async (input) => ({
            id: "exa-config-1",
            createdAt: new Date("2026-03-18T00:00:00.000Z"),
            updatedAt: new Date("2026-03-18T01:00:00.000Z"),
            type: input.type,
            enabled: input.enabled,
            hasApiKey: true,
        }));

        render(
            <StoreProvider appDataSource={createMockAppDataSource({
                webSearch: {
                    getConfig: async () => null,
                    saveConfig,
                },
            })}>
                <WebSearchManagement />
            </StoreProvider>
        );

        await user.click(await screen.findByRole("button", {name: /add exa/i}));
        await user.type(screen.getByLabelText(/api key/i), "exa-secret");
        await user.click(screen.getByRole("button", {name: /save exa/i}));

        await waitFor(() => {
            expect(saveConfig).toHaveBeenCalledWith({
                type: WebSearchProviderTypeEnum.EXA,
                enabled: true,
                apiKey: "exa-secret",
            });
        });

        expect(await screen.findByText(/^configured$/i)).toBeInTheDocument();
        expect(screen.getByText(/api key saved securely/i)).toBeInTheDocument();
    });

    it("saves Parallel settings in Redux state and updates the card state", async () => {
        const user = userEvent.setup();

        render(
            <StoreProvider appDataSource={createMockAppDataSource({
                webSearch: {
                    listOptions: async () => [
                        {
                            id: WebSearchProviderTypeEnum.EXA,
                            label: "Exa web search",
                            description: "Use Exa for fresh web results in this chat.",
                            disabled: true,
                        },
                        {
                            id: PARALLEL_WEB_SEARCH_PROVIDER_ID,
                            label: "Parallel web search",
                            description: "Setup required in Settings > Web Search.",
                            disabled: true,
                        },
                    ],
                },
            })}>
                <WebSearchManagement />
            </StoreProvider>
        );

        await user.click(await screen.findByRole("button", {name: /add parallel/i}));
        await user.type(screen.getByLabelText(/api key/i), "parallel-secret");
        await user.click(screen.getByRole("button", {name: /save parallel/i}));

        expect(await screen.findAllByText(/^configured$/i)).toHaveLength(1);
        expect(screen.getByText(/api key kept in redux state/i)).toBeInTheDocument();
        expect(screen.getByText(/parallel search and extraction are available/i)).toBeInTheDocument();
    });
});
