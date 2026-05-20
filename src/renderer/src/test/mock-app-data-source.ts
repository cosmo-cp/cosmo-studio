import type {AppDataSource} from "@/lib/app-data-source";
import {buildWebSearchOptions} from "@/lib/web-search-options";

type AppDataSourceOverrides = {
    backend?: AppDataSource["backend"];
    chat?: Partial<AppDataSource["chat"]>;
    command?: Partial<AppDataSource["command"]>;
    persona?: Partial<AppDataSource["persona"]>;
    modelProvider?: Partial<AppDataSource["modelProvider"]>;
    webSearch?: Partial<AppDataSource["webSearch"]>;
    mcpServer?: Partial<AppDataSource["mcpServer"]>;
    workflow?: Partial<AppDataSource["workflow"]>;
};

export function createMockAppDataSource(
    overrides: AppDataSourceOverrides = {}
): AppDataSource {
    return {
        backend: overrides.backend ?? "http",
        chat: {
            getAllChats: async () => [],
            getMessagesByChat: async () => [],
            createChat: async () => undefined,
            updateSelectedChat: async () => undefined,
            deleteChat: async () => undefined,
            updatePinnedStatusForChat: async () => undefined,
            updateSelectedModelForChat: async () => undefined,
            updateSelectedPersonaForChat: async () => undefined,
            ...overrides.chat,
        },
        command: {
            listAll: async () => [],
            create: async () => {
                throw new Error("command.create not mocked");
            },
            update: async () => {
                throw new Error("command.update not mocked");
            },
            delete: async () => undefined,
            execute: async () => ({
                name: "/noop",
                resolvedText: "",
            }),
            ...overrides.command,
        },
        persona: {
            getAll: async () => [],
            create: async () => {
                throw new Error("persona.create not mocked");
            },
            update: async () => {
                throw new Error("persona.update not mocked");
            },
            delete: async () => undefined,
            ...overrides.persona,
        },
        modelProvider: {
            getProvidersWithModels: async () => [],
            getAvailableModelsFromProviders: async () => [],
            addProvider: async () => {
                throw new Error("modelProvider.addProvider not mocked");
            },
            updateProvider: async () => {
                throw new Error("modelProvider.updateProvider not mocked");
            },
            deleteProvider: async () => undefined,
            ...overrides.modelProvider,
        },
        webSearch: {
            getConfig: async () => null,
            listOptions: async () => buildWebSearchOptions({
                exaConfig: null,
                parallelConfig: null,
            }),
            saveConfig: async () => {
                throw new Error("webSearch.saveConfig not mocked");
            },
            deleteConfig: async () => undefined,
            ...overrides.webSearch,
        },
        mcpServer: {
            getAll: async () => [],
            create: async () => {
                throw new Error("mcpServer.create not mocked");
            },
            update: async () => {
                throw new Error("mcpServer.update not mocked");
            },
            delete: async () => undefined,
            enable: async () => {
                throw new Error("mcpServer.enable not mocked");
            },
            disable: async () => {
                throw new Error("mcpServer.disable not mocked");
            },
            getServerTools: async () => [],
            updateToolApproval: async () => {
                throw new Error("mcpServer.updateToolApproval not mocked");
            },
            ...overrides.mcpServer,
        },
        workflow: {
            list: async () => [],
            create: async (input) => ({
                id: crypto.randomUUID(),
                title: input.title,
                summary: input.summary ?? null,
                status: "active",
                latestVersion: 1,
                createdAt: new Date(),
                updatedAt: new Date(),
            }),
            delete: async () => undefined,
            saveGraph: async (id, graph) => {
                const now = new Date();
                return {
                    id: crypto.randomUUID(),
                    workflowId: id,
                    version: 1,
                    graph,
                    createdAt: now,
                    updatedAt: now,
                };
            },
            runStart: async (input) => {
                const now = new Date();
                return {
                    id: crypto.randomUUID(),
                    workflowId: input.workflowId,
                    workflowVersionId: input.workflowVersionId ?? crypto.randomUUID(),
                    status: "queued",
                    startedAt: now,
                    completedAt: null,
                    errorMessage: null,
                    createdAt: now,
                    updatedAt: now,
                };
            },
            runGet: async () => undefined,
            ...overrides.workflow,
        },
    };
}
