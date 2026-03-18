import {describe, expect, it} from "vitest";
import type {
    CommandDefinition,
    McpServer,
    NewModel,
    Persona,
    ProviderWithModels,
} from "core/dto";
import {ModelProviderTypeEnum, ModelStatusEnum} from "core/database/schema/modelProviderSchema";
import {makeStore} from "@/lib/store/store";
import {
    deleteCommand,
    executeCommand,
    loadCommands,
    saveCommand,
} from "@/lib/store/commands-store";
import {
    deletePersona,
    loadPersonas,
    savePersona,
} from "@/lib/store/personas-store";
import {
    deleteProvider,
    loadAvailableModelsForProvider,
    loadProviders,
    saveProvider,
} from "@/lib/store/providers-store";
import {
    deleteMcpServer,
    loadMcpServerTools,
    loadMcpServers,
    saveMcpServer,
    toggleMcpServerEnabled,
    updateMcpToolApproval,
} from "@/lib/store/mcp-servers-store";
import {createMockAppDataSource} from "@/test/mock-app-data-source";

function buildCommand(id: string, name: string): CommandDefinition {
    return {
        id,
        name,
        description: `Description for ${name}`,
        template: `Template for ${name}`,
        argumentLabel: null,
        builtIn: false,
    };
}

function buildPersona(id: string, name: string): Persona {
    return {
        id,
        name,
        details: `${name} details`,
        createdAt: new Date("2026-03-18T00:00:00.000Z"),
        updatedAt: new Date("2026-03-18T00:00:00.000Z"),
    };
}

function buildModel(modelId: string, name: string): NewModel {
    return {
        modelId,
        name,
        description: `${name} description`,
        reasoning: false,
        attachment: false,
        toolCall: true,
        status: ModelStatusEnum.NOT_DEFINED,
        inputModalities: [],
        outputModalities: [],
        releaseDate: null,
        lastUpdatedByProvider: null,
    };
}

function buildProvider(id: string, name: string): ProviderWithModels {
    return {
        id,
        createdAt: new Date("2026-03-18T00:00:00.000Z"),
        updatedAt: null,
        type: ModelProviderTypeEnum.OPENAI,
        name,
        apiKey: "secret",
        apiUrl: null,
        models: [
            {
                id: `${id}-model`,
                createdAt: new Date("2026-03-18T00:00:00.000Z"),
                updatedAt: null,
                providerId: id,
                name: `${name} model`,
                modelId: `${name.toLowerCase()}-model`,
                description: null,
                reasoning: false,
                attachment: false,
                toolCall: true,
                status: ModelStatusEnum.NOT_DEFINED,
                inputModalities: [],
                outputModalities: [],
                releaseDate: null,
                lastUpdatedByProvider: null,
            },
        ],
    };
}

function buildMcpServer(id: string, name: string, enabled = true): McpServer {
    return {
        id,
        name,
        description: `${name} description`,
        transportType: "stdio",
        config: {command: "node", args: ["server.js"]},
        enabled,
        toolApprovals: {lookup: true},
        createdAt: new Date("2026-03-18T00:00:00.000Z"),
        updatedAt: new Date("2026-03-18T00:00:00.000Z"),
    };
}

describe("resource store thunks", () => {
    it("loads and mutates commands through the root store", async () => {
        let commands = [buildCommand("command-1", "/summarize")];

        const store = makeStore({
            appDataSource: createMockAppDataSource({
                command: {
                    listAll: async () => commands,
                    create: async (input) => {
                        const created = buildCommand("command-2", input.name);
                        commands = [...commands, created];
                        return created;
                    },
                    update: async (id, input) => {
                        const updated = {
                            ...commands.find((command) => command.id === id)!,
                            ...input,
                        };
                        commands = commands.map((command) => command.id === id ? updated : command);
                        return updated;
                    },
                    delete: async (id) => {
                        commands = commands.filter((command) => command.id !== id);
                    },
                    execute: async ({input}) => ({
                        name: "/summarize",
                        resolvedText: `resolved:${input}`,
                    }),
                },
            }),
        });

        await store.dispatch(loadCommands()).unwrap();
        expect(store.getState().commands.items).toHaveLength(1);

        await store.dispatch(saveCommand({
            input: {
                name: "/draft",
                description: "Draft text",
                template: "Draft text",
                argumentLabel: null,
            },
        })).unwrap();
        expect(store.getState().commands.items).toHaveLength(2);

        const execution = await store.dispatch(executeCommand({input: "/summarize now"})).unwrap();
        expect(execution.resolvedText).toBe("resolved:/summarize now");

        await store.dispatch(deleteCommand("command-1")).unwrap();
        expect(store.getState().commands.items.some((command) => command.id === "command-1")).toBe(false);
    });

    it("loads and mutates personas through the root store", async () => {
        let personas = [buildPersona("persona-1", "Research Assistant")];

        const store = makeStore({
            appDataSource: createMockAppDataSource({
                persona: {
                    getAll: async () => personas,
                    create: async (input) => {
                        const created = buildPersona("persona-2", input.name);
                        personas = [...personas, created];
                        return created;
                    },
                    update: async (id, input) => {
                        const updated = {
                            ...personas.find((persona) => persona.id === id)!,
                            ...input,
                        };
                        personas = personas.map((persona) => persona.id === id ? updated : persona);
                        return updated;
                    },
                    delete: async (id) => {
                        personas = personas.filter((persona) => persona.id !== id);
                    },
                },
            }),
        });

        await store.dispatch(loadPersonas()).unwrap();
        expect(store.getState().personas.items).toHaveLength(1);

        await store.dispatch(savePersona({
            input: {
                name: "Writer",
                details: "Writes clearly",
            },
        })).unwrap();
        expect(store.getState().personas.items).toHaveLength(2);

        await store.dispatch(deletePersona("persona-1")).unwrap();
        expect(store.getState().personas.items.some((persona) => persona.id === "persona-1")).toBe(false);
    });

    it("loads providers and model lookups through the root store", async () => {
        let providers = [buildProvider("provider-1", "Primary Provider")];
        const availableModels = [buildModel("next-model", "Next Model")];

        const store = makeStore({
            appDataSource: createMockAppDataSource({
                modelProvider: {
                    getProvidersWithModels: async () => providers,
                    getAvailableModelsFromProviders: async () => availableModels,
                    addProvider: async (providerData) => {
                        const created = buildProvider("provider-2", providerData.name);
                        providers = [...providers, created];
                        return created;
                    },
                    updateProvider: async (providerId, providerData) => {
                        const updated = buildProvider(providerId, providerData.name);
                        providers = providers.map((provider) => provider.id === providerId ? updated : provider);
                        return updated;
                    },
                    deleteProvider: async (providerId) => {
                        providers = providers.filter((provider) => provider.id !== providerId);
                    },
                },
            }),
        });

        await store.dispatch(loadProviders()).unwrap();
        expect(store.getState().providers.items).toHaveLength(1);

        const models = await store.dispatch(loadAvailableModelsForProvider({
            type: ModelProviderTypeEnum.OPENAI,
            name: "Secondary Provider",
            apiKey: "key",
            apiUrl: undefined,
        })).unwrap();
        expect(models).toEqual(availableModels);

        await store.dispatch(saveProvider({
            providerData: {
                type: ModelProviderTypeEnum.OPENAI,
                name: "Secondary Provider",
                apiKey: "key",
                apiUrl: undefined,
            },
            models: availableModels,
        })).unwrap();
        expect(store.getState().providers.items).toHaveLength(2);

        await store.dispatch(deleteProvider("provider-1")).unwrap();
        expect(store.getState().providers.items.some((provider) => provider.id === "provider-1")).toBe(false);
    });

    it("loads MCP servers and tool actions through the root store", async () => {
        let servers = [buildMcpServer("mcp-1", "filesystem", true)];

        const store = makeStore({
            appDataSource: createMockAppDataSource({
                mcpServer: {
                    getAll: async () => servers,
                    create: async (input) => {
                        const created = buildMcpServer("mcp-2", input.name, input.enabled ?? true);
                        servers = [...servers, created];
                        return created;
                    },
                    update: async (id, input) => {
                        const updated = buildMcpServer(id, input.name, input.enabled ?? true);
                        servers = servers.map((server) => server.id === id ? updated : server);
                        return updated;
                    },
                    delete: async (id) => {
                        servers = servers.filter((server) => server.id !== id);
                    },
                    enable: async (id) => {
                        const updated = buildMcpServer(id, "filesystem", true);
                        servers = servers.map((server) => server.id === id ? updated : server);
                        return updated;
                    },
                    disable: async (id) => {
                        const updated = buildMcpServer(id, "filesystem", false);
                        servers = servers.map((server) => server.id === id ? updated : server);
                        return updated;
                    },
                    getServerTools: async () => [
                        {
                            name: "lookup",
                            description: "Look up something",
                        },
                    ],
                    updateToolApproval: async (serverId, _toolName, needsApproval) => {
                        const updated = {
                            ...servers.find((server) => server.id === serverId)!,
                            toolApprovals: {lookup: needsApproval},
                        };
                        servers = servers.map((server) => server.id === serverId ? updated : server);
                        return updated;
                    },
                },
            }),
        });

        await store.dispatch(loadMcpServers()).unwrap();
        expect(store.getState().mcpServers.items).toHaveLength(1);

        const tools = await store.dispatch(loadMcpServerTools("mcp-1")).unwrap();
        expect(tools.tools).toHaveLength(1);

        await store.dispatch(toggleMcpServerEnabled({
            serverId: "mcp-1",
            enabled: false,
        })).unwrap();
        expect(store.getState().mcpServers.items[0]?.enabled).toBe(false);

        await store.dispatch(updateMcpToolApproval({
            serverId: "mcp-1",
            toolName: "lookup",
            needsApproval: false,
        })).unwrap();
        expect((store.getState().mcpServers.items[0]?.toolApprovals as Record<string, boolean>).lookup).toBe(false);

        await store.dispatch(saveMcpServer({
            input: {
                name: "memory",
                description: "Memory tools",
                transportType: "stdio",
                config: {command: "node", args: ["memory.js"]},
                enabled: true,
                toolApprovals: {},
            },
        })).unwrap();
        expect(store.getState().mcpServers.items).toHaveLength(2);

        await store.dispatch(deleteMcpServer("mcp-1")).unwrap();
        expect(store.getState().mcpServers.items.some((server) => server.id === "mcp-1")).toBe(false);
    });
});
