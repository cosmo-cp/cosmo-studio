import type {AppDataSource} from "@/lib/app-data-source";

type AppDataSourceOverrides = {
    backend?: AppDataSource["backend"];
    chat?: Partial<AppDataSource["chat"]>;
    command?: Partial<AppDataSource["command"]>;
    persona?: Partial<AppDataSource["persona"]>;
    modelProvider?: Partial<AppDataSource["modelProvider"]>;
    webSearch?: Partial<AppDataSource["webSearch"]>;
    mcpServer?: Partial<AppDataSource["mcpServer"]>;
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
            listOptions: async () => [],
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
    };
}
