import {render, screen, waitFor, within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {AcpAgentManagement} from "@/components/acp-agent-management";
import {StoreProvider} from "@/lib/store/store-provider";
import {createMockAppDataSource} from "@/test/mock-app-data-source";
import type {AcpAgentView, AcpRegistryView} from "core/dto";
import {
    AcpAgentInstallStatusEnum,
    AcpAgentSourceEnum,
} from "core/database/schema/acpAgentSchema";

const now = new Date("2026-05-20T00:00:00.000Z");

class ResizeObserverMock {
    observe() {
    }

    unobserve() {
    }

    disconnect() {
    }
}

const registry: AcpRegistryView = {
    version: "test",
    fetchedAt: now,
    agents: [
        {
            id: "codex-cli",
            name: "Codex CLI",
            version: "0.14.0",
            description: "ACP adapter for OpenAI coding assistant",
            distribution: {
                npx: {
                    package: "@openai/codex@0.14.0",
                    args: ["--acp"],
                },
            },
        },
        {
            id: "binary-only",
            name: "Binary Only",
            version: "1.0.0",
            description: "Requires manual setup",
            distribution: {
                binary: {
                    "darwin-aarch64": {
                        archive: "https://example.com/binary.zip",
                        cmd: "./binary",
                    },
                },
            },
        },
    ],
};

function buildInstalledAgent(registryId: string): AcpAgentView {
    return {
        id: "agent-1",
        name: "Codex CLI",
        description: "ACP adapter for OpenAI coding assistant",
        source: AcpAgentSourceEnum.REGISTRY,
        registryId,
        version: "0.14.0",
        command: "npx",
        args: ["-y", "@openai/codex@0.14.0", "--acp"],
        defaultCwd: null,
        authMethodId: null,
        enabled: true,
        installStatus: AcpAgentInstallStatusEnum.INSTALLED,
        mcpServerIds: [],
        metadata: {},
        createdAt: now,
        updatedAt: now,
        envKeys: [],
    };
}

describe("AcpAgentManagement", () => {
    beforeEach(() => {
        vi.stubGlobal("ResizeObserver", ResizeObserverMock);
    });

    it("shows a tooltip for testing installed agents", async () => {
        const user = userEvent.setup();

        render(
            <StoreProvider appDataSource={createMockAppDataSource({
                acpAgent: {
                    getAll: async () => [buildInstalledAgent("codex-cli")],
                },
            })}>
                <AcpAgentManagement />
            </StoreProvider>
        );

        const testButton = await screen.findByRole("button", {name: /test codex cli/i});
        await user.hover(testButton);
        expect(await screen.findAllByText("Test connection")).not.toHaveLength(0);
    });

    it("shows a tooltip for deleting installed agents", async () => {
        const user = userEvent.setup();

        render(
            <StoreProvider appDataSource={createMockAppDataSource({
                acpAgent: {
                    getAll: async () => [buildInstalledAgent("codex-cli")],
                },
            })}>
                <AcpAgentManagement />
            </StoreProvider>
        );

        const deleteButton = await screen.findByRole("button", {name: /delete codex cli/i});
        await user.hover(deleteButton);
        expect(await screen.findAllByText("Delete agent")).not.toHaveLength(0);
    });

    it("opens the registry in a dialog and installs registry agents", async () => {
        const user = userEvent.setup();
        const getRegistry = vi.fn(async () => registry);
        const installFromRegistry = vi.fn(async (input) => buildInstalledAgent(input.registryId));

        render(
            <StoreProvider appDataSource={createMockAppDataSource({
                acpAgent: {
                    getAll: async () => [],
                    getRegistry,
                    installFromRegistry,
                },
            })}>
                <AcpAgentManagement />
            </StoreProvider>
        );

        expect(screen.queryByRole("tab", {name: /registry/i})).not.toBeInTheDocument();
        await user.click(screen.getByRole("button", {name: /registry/i}));

        expect(await screen.findByRole("dialog")).toBeInTheDocument();
        expect(await screen.findByRole("heading", {name: /acp registry/i})).toBeInTheDocument();
        await waitFor(() => expect(getRegistry).toHaveBeenCalledTimes(1));

        const codexRow = screen.getByText("Codex CLI").closest("tr");
        expect(codexRow).not.toBeNull();
        await user.click(within(codexRow as HTMLElement).getByRole("button", {name: /install/i}));

        await waitFor(() => {
            expect(installFromRegistry).toHaveBeenCalledWith({
                registryId: "codex-cli",
                enabled: true,
            });
        });
        expect(await within(codexRow as HTMLElement).findByText(/installed/i)).toBeInTheDocument();
        expect(screen.getByText("Binary Only").closest("tr")).toHaveTextContent(/manual/i);
    });
});
