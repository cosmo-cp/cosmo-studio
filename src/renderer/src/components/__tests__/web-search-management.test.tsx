import {render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {StoreProvider} from "@/lib/store/store-provider";
import {createMockAppDataSource} from "@/test/mock-app-data-source";
import {WebSearchManagement} from "@/components/web-search-management";
import {WebSearchProviderTypeEnum} from "core/database/schema/webSearchConfigSchema";

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

    it("shows the Exa card instead of the placeholder sections", async () => {
        render(
            <StoreProvider appDataSource={createMockAppDataSource()}>
                <WebSearchManagement />
            </StoreProvider>
        );

        expect(await screen.findByRole("heading", {name: /^web search$/i})).toBeInTheDocument();
        expect(screen.getByText(/exa web search/i)).toBeInTheDocument();
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

        expect(await screen.findByText(/configured/i)).toBeInTheDocument();
        expect(screen.getByText(/api key saved securely/i)).toBeInTheDocument();
    });
});
