import {fireEvent, render, screen, waitFor, within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {AcpAgentManagement} from "@/components/acp-agent-management";
import {StoreProvider} from "@/app/store-provider";
import {createMockAppDataSource} from "@/test/mock-app-data-source";
import type {AcpAgentUpdateInput, AcpAgentView, AcpRegistryView} from "core/dto";
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

function buildAgentWithEnvKeys(): AcpAgentView {
    return {
        ...buildInstalledAgent("codex-cli"),
        envKeys: ["TOKEN"],
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

    it("shows a tooltip for editing installed agents", async () => {
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

        const editButton = await screen.findByRole("button", {name: /edit codex cli/i});
        await user.hover(editButton);
        expect(await screen.findAllByText("Edit agent")).not.toHaveLength(0);
    });

    it("opens an edit dialog and preserves env secrets unless replacement env is entered", async () => {
        const user = userEvent.setup();
        const update = vi.fn(async (id: string, input: AcpAgentUpdateInput): Promise<AcpAgentView> => ({
            ...buildAgentWithEnvKeys(),
            ...input,
            id,
            updatedAt: new Date("2026-05-20T01:00:00.000Z"),
        }));

        render(
            <StoreProvider appDataSource={createMockAppDataSource({
                acpAgent: {
                    getAll: async () => [buildAgentWithEnvKeys()],
                    update,
                },
            })}>
                <AcpAgentManagement />
            </StoreProvider>
        );

        await user.click(await screen.findByRole("button", {name: /edit codex cli/i}));

        expect(await screen.findByRole("heading", {name: /edit agent/i})).toBeInTheDocument();
        expect(screen.getByText(/stored env keys: token/i)).toBeInTheDocument();

        await user.clear(screen.getByLabelText(/^name$/i));
        await user.type(screen.getByLabelText(/^name$/i), "Codex Edited");
        await user.clear(screen.getByLabelText(/^command$/i));
        await user.type(screen.getByLabelText(/^command$/i), "uvx");
        await user.clear(screen.getByLabelText(/^workspace path$/i));
        await user.type(screen.getByLabelText(/^workspace path$/i), "/workspace");
        await user.clear(screen.getByLabelText(/^auth method id$/i));
        await user.type(screen.getByLabelText(/^auth method id$/i), "oauth-test");
        fireEvent.change(screen.getByLabelText(/^args json$/i), {
            target: {value: '["--acp","--verbose"]'},
        });
        await user.click(screen.getByRole("button", {name: /save changes/i}));

        await waitFor(() => {
            expect(update).toHaveBeenCalledWith("agent-1", expect.objectContaining({
                name: "Codex Edited",
                command: "uvx",
                args: ["--acp", "--verbose"],
                defaultCwd: "/workspace",
                authMethodId: "oauth-test",
            }));
        });
        expect(update.mock.calls[0][1]).not.toHaveProperty("env");
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

        const dialog = await screen.findByRole("dialog");
        expect(dialog).toHaveClass("w-[calc(100vw-2rem)]", "max-w-[900px]", "overflow-hidden");
        expect(await screen.findByRole("heading", {name: /acp registry/i})).toBeInTheDocument();
        await waitFor(() => expect(getRegistry).toHaveBeenCalledTimes(1));
        const registryScrollArea = screen.getByTestId("acp-registry-table-scroll");
        expect(registryScrollArea).toHaveClass("min-h-0", "flex-1", "overflow-auto");
        expect(within(registryScrollArea).getByRole("table")).toHaveClass("table-fixed");

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
