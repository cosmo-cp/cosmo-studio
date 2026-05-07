import type {
    Chat,
    CommandCreateInput,
    CommandDefinition,
    CommandExecution,
    McpToolDefinition,
    McpServer,
    McpServerCreateInput,
    ModelIdentifier,
    ModelLite,
    ModelProviderCreateInput,
    NewModel,
    Persona,
    PersonaCreateInput,
    PersonaIdentifier,
    ProviderWithModels,
    WebSearchConfigSaveInput,
    WebSearchConfigView,
} from "core/dto";
import {
    ModelModalityEnum,
    ModelProviderTypeEnum,
    ModelStatusEnum,
} from "core/database/schema/modelProviderSchema";
import {WebSearchProviderTypeEnum} from "core/database/schema/webSearchConfigSchema";
import type {UIMessage} from "ai";
import {
    buildWebSearchOptions,
    type FrontendWebSearchProviderConfig,
    type WebSearchOption,
} from "@/lib/web-search-options";
import {httpApi, type HttpApi} from "@/lib/generated-http-api";

type BackendKind = "electron" | "http";

export type McpTool = McpToolDefinition;

export interface AppDataSource {
    backend: BackendKind;
    chat: {
        getAllChats(searchQuery: string | null): Promise<Chat[]>;
        getMessagesByChat(chatId: string): Promise<UIMessage[] | null>;
        createChat(input: {title: string}): Promise<void>;
        updateSelectedChat(chatId: string): Promise<void>;
        deleteChat(chatId: string): Promise<void>;
        updatePinnedStatusForChat(chatId: string, pinned: boolean): Promise<void>;
        updateSelectedModelForChat(chatId: string, identifier: ModelIdentifier): Promise<void>;
        updateSelectedPersonaForChat(chatId: string, identifier: PersonaIdentifier): Promise<void>;
    };
    command: {
        listAll(): Promise<CommandDefinition[]>;
        create(input: CommandCreateInput): Promise<CommandDefinition>;
        update(id: string, input: CommandCreateInput): Promise<CommandDefinition>;
        delete(id: string): Promise<void>;
        execute(input: {input: string}): Promise<CommandExecution>;
    };
    persona: {
        getAll(): Promise<Persona[]>;
        create(input: PersonaCreateInput): Promise<Persona>;
        update(id: string, input: PersonaCreateInput): Promise<Persona>;
        delete(id: string): Promise<void>;
    };
    modelProvider: {
        getProvidersWithModels(): Promise<ProviderWithModels[]>;
        getAvailableModelsFromProviders(provider: ModelProviderCreateInput): Promise<NewModel[]>;
        addProvider(providerData: ModelProviderCreateInput, models: NewModel[]): Promise<ProviderWithModels>;
        updateProvider(
            providerId: string,
            updateObject: ModelProviderCreateInput,
            modelsData: NewModel[]
        ): Promise<ProviderWithModels>;
        deleteProvider(providerId: string): Promise<void>;
    };
    webSearch: {
        getConfig(type: WebSearchProviderTypeEnum): Promise<WebSearchConfigView | null>;
        listOptions(): Promise<WebSearchOption[]>;
        saveConfig(input: WebSearchConfigSaveInput): Promise<WebSearchConfigView>;
        deleteConfig(type: WebSearchProviderTypeEnum): Promise<void>;
    };
    mcpServer: {
        getAll(): Promise<McpServer[]>;
        create(input: McpServerCreateInput): Promise<McpServer>;
        update(id: string, updates: McpServerCreateInput): Promise<McpServer>;
        delete(id: string): Promise<void>;
        enable(id: string): Promise<McpServer>;
        disable(id: string): Promise<McpServer>;
        getServerTools(id: string): Promise<McpTool[]>;
        updateToolApproval(serverId: string, toolName: string, needsApproval: boolean): Promise<McpServer>;
    };
}

interface ResolveAppDataSourceOptions {
    preferredBackend?: BackendKind;
}

interface DummyHttpState {
    chats: Chat[];
    messagesByChatId: Record<string, UIMessage[]>;
    commands: CommandDefinition[];
    personas: Persona[];
    providers: ProviderWithModels[];
    webSearchConfig: WebSearchConfigView | null;
    parallelWebSearchConfig: FrontendWebSearchProviderConfig | null;
    mcpServers: McpServer[];
    mcpToolsByServerId: Record<string, McpTool[]>;
}

function cloneValue<T>(value: T): T {
    return structuredClone(value);
}

function buildNewModel(name: string, modelId: string): NewModel {
    return {
        name,
        modelId,
        description: `${name} placeholder model`,
        reasoning: false,
        attachment: false,
        toolCall: true,
        status: ModelStatusEnum.NOT_DEFINED,
        inputModalities: [ModelModalityEnum.TEXT],
        outputModalities: [ModelModalityEnum.TEXT],
        releaseDate: null,
        lastUpdatedByProvider: null,
    };
}

function materializeModel(model: NewModel): ModelLite {
    return {
        id: crypto.randomUUID(),
        createdAt: new Date(),
        updatedAt: null,
        name: model.name,
        modelId: model.modelId,
        description: model.description ?? null,
        reasoning: model.reasoning ?? false,
        attachment: model.attachment ?? false,
        toolCall: model.toolCall ?? false,
        status: model.status ?? ModelStatusEnum.NOT_DEFINED,
        inputModalities: model.inputModalities ?? [],
        outputModalities: model.outputModalities ?? [],
        releaseDate: model.releaseDate ?? null,
        lastUpdatedByProvider: model.lastUpdatedByProvider ?? null,
    };
}

function buildProvider(
    providerId: string,
    type: ModelProviderTypeEnum,
    name: string,
    models: NewModel[]
): ProviderWithModels {
    return {
        id: providerId,
        createdAt: new Date(),
        updatedAt: null,
        type,
        name,
        apiKey: "dummy-api-key",
        apiUrl: null,
        models: models.map((model) => materializeModel(model)),
    };
}

function sortChats(chats: Chat[]): Chat[] {
    return [...chats].sort((left, right) => {
        if (left.pinned !== right.pinned) {
            return left.pinned ? -1 : 1;
        }
        const leftTime = left.lastMessageAt?.getTime() ?? left.createdAt.getTime();
        const rightTime = right.lastMessageAt?.getTime() ?? right.createdAt.getTime();
        return rightTime - leftTime;
    });
}

function filterChatsBySearch(chats: Chat[], searchQuery: string | null): Chat[] {
    if (!searchQuery) {
        return chats;
    }

    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
        return chats;
    }

    return chats.filter((chat) => {
        const haystack = `${chat.title} ${chat.lastMessage ?? ""}`.toLowerCase();
        return haystack.includes(normalizedQuery);
    });
}

function setSelectedChat(chats: Chat[], chatId: string): Chat[] {
    return chats.map((chat) => ({
        ...chat,
        selected: chat.id === chatId,
    }));
}

function buildDummyHttpState(): DummyHttpState {
    const providerModels = [
        buildNewModel("GPT Demo", "gpt-demo"),
        buildNewModel("Reasoner Demo", "reasoner-demo"),
    ];
    const providerId = "http-provider-1";

    return {
        chats: [
            {
                id: "http-chat-1",
                createdAt: new Date("2026-03-18T09:00:00.000Z"),
                title: "HTTP Demo Chat",
                pinned: true,
                pinnedAt: new Date("2026-03-18T09:05:00.000Z"),
                selectedProvider: "Demo HTTP Provider",
                selectedModelId: "gpt-demo",
                selectedPersonaId: null,
                selected: true,
                lastMessage: "This chat was loaded from the dummy HTTP adapter.",
                lastMessageAt: new Date("2026-03-18T09:07:00.000Z"),
            },
            {
                id: "http-chat-2",
                createdAt: new Date("2026-03-17T13:00:00.000Z"),
                title: "Second HTTP Chat",
                pinned: false,
                pinnedAt: null,
                selectedProvider: null,
                selectedModelId: null,
                selectedPersonaId: null,
                selected: false,
                lastMessage: "This is another dummy conversation.",
                lastMessageAt: new Date("2026-03-17T13:15:00.000Z"),
            },
        ],
        messagesByChatId: {
            "http-chat-1": [
                {
                    id: "http-message-1",
                    role: "assistant",
                    parts: [
                        {
                            type: "text",
                            text: "This response came from the placeholder HTTP data source.",
                        },
                    ],
                },
            ],
            "http-chat-2": [
                {
                    id: "http-message-2",
                    role: "assistant",
                    parts: [
                        {
                            type: "text",
                            text: "Wire a real HTTP API here when the backend is ready.",
                        },
                    ],
                },
            ],
        },
        commands: [
            {
                id: "http-command-1",
                name: "/summarize",
                description: "Summarize the chat.",
                template: "Summarize the current conversation.",
                argumentLabel: null,
                builtIn: true,
            },
            {
                id: "http-command-2",
                name: "/draft",
                description: "Create a first draft.",
                template: "Create a first draft for the following request:",
                argumentLabel: "topic",
                builtIn: false,
            },
        ],
        personas: [
            {
                id: "http-persona-1",
                name: "Research Assistant",
                details: "Focus on structured analysis.",
                createdAt: new Date("2026-03-18T08:00:00.000Z"),
                updatedAt: new Date("2026-03-18T08:00:00.000Z"),
            },
        ],
        providers: [
            buildProvider(providerId, ModelProviderTypeEnum.OPENAI, "Demo HTTP Provider", providerModels),
        ],
        webSearchConfig: {
            id: "http-web-search-config-1",
            createdAt: new Date("2026-03-18T08:30:00.000Z"),
            updatedAt: new Date("2026-03-18T08:45:00.000Z"),
            type: WebSearchProviderTypeEnum.EXA,
            enabled: true,
            hasApiKey: true,
        },
        parallelWebSearchConfig: {
            enabled: true,
            hasApiKey: true,
        },
        mcpServers: [
            {
                id: "http-mcp-1",
                name: "filesystem-server",
                description: "Dummy MCP server from the HTTP adapter.",
                transportType: "stdio",
                config: {command: "node", args: ["dummy-mcp"]},
                enabled: true,
                toolApprovals: {readFile: true},
                createdAt: new Date("2026-03-18T07:00:00.000Z"),
                updatedAt: new Date("2026-03-18T07:00:00.000Z"),
            },
        ],
        mcpToolsByServerId: {
            "http-mcp-1": [
                {
                    name: "readFile",
                    title: "Read File",
                    description: "Read a file from the dummy HTTP-backed server.",
                },
            ],
        },
    };
}

function createApiBackedAppDataSource(api: HttpApi, backend: BackendKind): AppDataSource {
    return {
        backend,
        chat: {
            getAllChats(searchQuery) {
                return api.chat.getAllChats(searchQuery);
            },
            getMessagesByChat(chatId) {
                return api.message.getByChat(chatId);
            },
            async createChat(input) {
                await api.chat.createChat(input);
            },
            async updateSelectedChat(chatId) {
                await api.chat.updateSelectedChat(chatId);
            },
            async deleteChat(chatId) {
                await api.chat.deleteChat(chatId);
            },
            async updatePinnedStatusForChat(chatId, pinned) {
                await api.chat.updatePinnedStatusForChat(chatId, pinned);
            },
            async updateSelectedModelForChat(chatId, identifier) {
                await api.chat.updateSelectedModelForChat(chatId, identifier);
            },
            async updateSelectedPersonaForChat(chatId, identifier) {
                await api.chat.updateSelectedPersonaForChat(chatId, identifier);
            },
        },
        command: {
            listAll() {
                return api.command.listAll();
            },
            create(input) {
                return api.command.create(input);
            },
            update(id, input) {
                return api.command.update(id, input);
            },
            async delete(id) {
                await api.command.delete(id);
            },
            execute(input) {
                return api.command.execute(input);
            },
        },
        persona: {
            getAll() {
                return api.persona.getAll();
            },
            create(input) {
                return api.persona.create(input);
            },
            update(id, input) {
                return api.persona.update(id, input);
            },
            async delete(id) {
                await api.persona.delete(id);
            },
        },
        modelProvider: {
            getProvidersWithModels() {
                return api.modelProvider.getProvidersWithModels();
            },
            getAvailableModelsFromProviders(provider) {
                return api.modelProvider.getAvailableModelsFromProviders(provider);
            },
            addProvider(providerData, models) {
                return api.modelProvider.addProvider(providerData, models);
            },
            updateProvider(providerId, updateObject, modelsData) {
                return api.modelProvider.updateProvider(providerId, updateObject, modelsData);
            },
            async deleteProvider(providerId) {
                await api.modelProvider.deleteProvider(providerId);
            },
        },
        webSearch: {
            async getConfig(type) {
                return api.webSearch.getConfig(type);
            },
            async listOptions() {
                const config = await api.webSearch.getConfig(WebSearchProviderTypeEnum.EXA);
                return buildWebSearchOptions({
                    exaConfig: config,
                    parallelConfig: null,
                });
            },
            saveConfig(input) {
                return api.webSearch.saveConfig(input);
            },
            async deleteConfig(type) {
                await api.webSearch.deleteConfig(type);
            },
        },
        mcpServer: {
            getAll() {
                return api.mcpServer.getAll();
            },
            create(input) {
                return api.mcpServer.create(input);
            },
            update(id, updates) {
                return api.mcpServer.update(id, updates);
            },
            async delete(id) {
                await api.mcpServer.delete(id);
            },
            enable(id) {
                return api.mcpServer.enable(id);
            },
            disable(id) {
                return api.mcpServer.disable(id);
            },
            getServerTools(id) {
                return api.mcpServer.getServerTools(id);
            },
            updateToolApproval(serverId, toolName, needsApproval) {
                return api.mcpServer.updateToolApproval(serverId, toolName, needsApproval);
            },
        },
    };
}

function createElectronAppDataSource(): AppDataSource {
    return createApiBackedAppDataSource(window.api, "electron");
}

function createHttpAppDataSource(): AppDataSource {
    return createApiBackedAppDataSource(httpApi, "http");
}

function createDummyHttpAppDataSource(): AppDataSource {
    const state = buildDummyHttpState();

    return {
        backend: "http",
        chat: {
            async getAllChats(searchQuery) {
                const chats = filterChatsBySearch(sortChats(state.chats), searchQuery);
                return cloneValue(chats);
            },
            async getMessagesByChat(chatId) {
                return cloneValue(state.messagesByChatId[chatId] ?? []);
            },
            async createChat(input) {
                state.chats = state.chats.map((chat) => ({
                    ...chat,
                    selected: false,
                }));

                const chatId = `http-chat-${crypto.randomUUID()}`;
                const now = new Date();
                state.chats.unshift({
                    id: chatId,
                    createdAt: now,
                    title: input.title,
                    pinned: false,
                    pinnedAt: null,
                    selectedProvider: null,
                    selectedModelId: null,
                    selectedPersonaId: null,
                    selected: true,
                    lastMessage: "This chat was created by the dummy HTTP adapter.",
                    lastMessageAt: now,
                });
                state.messagesByChatId[chatId] = [];
            },
            async updateSelectedChat(chatId) {
                state.chats = setSelectedChat(state.chats, chatId);
            },
            async deleteChat(chatId) {
                state.chats = state.chats.filter((chat) => chat.id !== chatId);
                delete state.messagesByChatId[chatId];
                if (!state.chats.some((chat) => chat.selected) && state.chats[0]) {
                    state.chats = setSelectedChat(state.chats, state.chats[0].id);
                }
            },
            async updatePinnedStatusForChat(chatId, pinned) {
                state.chats = state.chats.map((chat) =>
                    chat.id === chatId ? {
                        ...chat,
                        pinned,
                        pinnedAt: pinned ? new Date() : null,
                    } : chat
                );
            },
            async updateSelectedModelForChat(chatId, identifier) {
                state.chats = state.chats.map((chat) =>
                    chat.id === chatId ? {
                        ...chat,
                        selectedProvider: identifier.selectedProvider,
                        selectedModelId: identifier.selectedModelId,
                    } : chat
                );
            },
            async updateSelectedPersonaForChat(chatId, identifier) {
                state.chats = state.chats.map((chat) =>
                    chat.id === chatId ? {
                        ...chat,
                        selectedPersonaId: identifier.selectedPersonaId,
                    } : chat
                );
            },
        },
        command: {
            async listAll() {
                return cloneValue(state.commands);
            },
            async create(input) {
                const created: CommandDefinition = {
                    id: crypto.randomUUID(),
                    name: input.name,
                    description: input.description,
                    template: input.template,
                    argumentLabel: input.argumentLabel ?? null,
                    builtIn: false,
                };
                state.commands.push(created);
                return cloneValue(created);
            },
            async update(id, input) {
                const existing = state.commands.find((command) => command.id === id);
                if (!existing) {
                    throw new Error("Command not found");
                }
                const updated = {
                    ...existing,
                    ...input,
                    argumentLabel: input.argumentLabel ?? null,
                };
                state.commands = state.commands.map((command) => command.id === id ? updated : command);
                return cloneValue(updated);
            },
            async delete(id) {
                state.commands = state.commands.filter((command) => command.id !== id);
            },
            async execute(input) {
                const trimmedInput = input.input.trim();
                const [commandName, ...argumentParts] = trimmedInput.split(/\s+/);
                const command = state.commands.find((item) => item.name === commandName);
                if (!command) {
                    return {
                        name: commandName,
                        argument: argumentParts.join(" ") || undefined,
                        resolvedText: trimmedInput,
                    };
                }
                const argument = argumentParts.join(" ").trim();
                return {
                    name: command.name,
                    argument: argument || undefined,
                    resolvedText: argument ?
                        `${command.template}\n\nArgument: ${argument}` :
                        command.template,
                };
            },
        },
        persona: {
            async getAll() {
                return cloneValue(state.personas);
            },
            async create(input) {
                const created: Persona = {
                    id: crypto.randomUUID(),
                    name: input.name,
                    details: input.details,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };
                state.personas.push(created);
                return cloneValue(created);
            },
            async update(id, input) {
                const existing = state.personas.find((persona) => persona.id === id);
                if (!existing) {
                    throw new Error("Persona not found");
                }
                const updated = {
                    ...existing,
                    ...input,
                    updatedAt: new Date(),
                };
                state.personas = state.personas.map((persona) => persona.id === id ? updated : persona);
                return cloneValue(updated);
            },
            async delete(id) {
                state.personas = state.personas.filter((persona) => persona.id !== id);
            },
        },
        modelProvider: {
            async getProvidersWithModels() {
                return cloneValue(state.providers);
            },
            async getAvailableModelsFromProviders(provider) {
                const prefix = provider.name || provider.type;
                return cloneValue([
                    buildNewModel(`${prefix} Primary`, `${provider.type}-primary`),
                    buildNewModel(`${prefix} Reasoner`, `${provider.type}-reasoner`),
                ]);
            },
            async addProvider(providerData, models) {
                const providerId = crypto.randomUUID();
                const created: ProviderWithModels = {
                    id: providerId,
                    createdAt: new Date(),
                    updatedAt: null,
                    type: providerData.type,
                    name: providerData.name,
                    apiKey: providerData.apiKey,
                    apiUrl: providerData.apiUrl ?? null,
                    models: models.map((model) => materializeModel(model)),
                };
                state.providers.push(created);
                return cloneValue(created);
            },
            async updateProvider(providerId, updateObject, modelsData) {
                const existing = state.providers.find((provider) => provider.id === providerId);
                if (!existing) {
                    throw new Error("Provider not found");
                }
                const updated: ProviderWithModels = {
                    ...existing,
                    ...updateObject,
                    apiUrl: updateObject.apiUrl ?? null,
                    models: modelsData.map((model) => materializeModel(model)),
                };
                state.providers = state.providers.map((provider) => provider.id === providerId ? updated : provider);
                return cloneValue(updated);
            },
            async deleteProvider(providerId) {
                state.providers = state.providers.filter((provider) => provider.id !== providerId);
            },
        },
        webSearch: {
            async getConfig(type) {
                if (state.webSearchConfig?.type !== type) {
                    return null;
                }
                return cloneValue(state.webSearchConfig);
            },
            async listOptions() {
                return buildWebSearchOptions({
                    exaConfig: state.webSearchConfig,
                    parallelConfig: state.parallelWebSearchConfig,
                });
            },
            async saveConfig(input) {
                const now = new Date();
                const existing = state.webSearchConfig;
                const config: WebSearchConfigView = {
                    id: existing?.id ?? crypto.randomUUID(),
                    createdAt: existing?.createdAt ?? now,
                    updatedAt: now,
                    type: input.type,
                    enabled: input.enabled,
                    hasApiKey: Boolean(input.apiKey?.trim()) || existing?.hasApiKey || false,
                };
                state.webSearchConfig = config;
                return cloneValue(config);
            },
            async deleteConfig(type) {
                if (state.webSearchConfig?.type === type) {
                    state.webSearchConfig = null;
                }
            },
        },
        mcpServer: {
            async getAll() {
                return cloneValue(state.mcpServers);
            },
            async create(input) {
                const created: McpServer = {
                    id: crypto.randomUUID(),
                    name: input.name,
                    description: input.description ?? null,
                    transportType: input.transportType,
                    config: input.config,
                    enabled: input.enabled ?? true,
                    toolApprovals: {},
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };
                state.mcpServers.push(created);
                state.mcpToolsByServerId[created.id] = [
                    {
                        name: "dummyTool",
                        title: "Dummy Tool",
                        description: "Placeholder tool from the dummy HTTP adapter.",
                    },
                ];
                return cloneValue(created);
            },
            async update(id, updates) {
                const existing = state.mcpServers.find((server) => server.id === id);
                if (!existing) {
                    throw new Error("MCP server not found");
                }
                const updated: McpServer = {
                    ...existing,
                    ...updates,
                    description: updates.description ?? null,
                    updatedAt: new Date(),
                };
                state.mcpServers = state.mcpServers.map((server) => server.id === id ? updated : server);
                return cloneValue(updated);
            },
            async delete(id) {
                state.mcpServers = state.mcpServers.filter((server) => server.id !== id);
                delete state.mcpToolsByServerId[id];
            },
            async enable(id) {
                const server = state.mcpServers.find((item) => item.id === id);
                if (!server) {
                    throw new Error("MCP server not found");
                }
                server.enabled = true;
                server.updatedAt = new Date();
                return cloneValue(server);
            },
            async disable(id) {
                const server = state.mcpServers.find((item) => item.id === id);
                if (!server) {
                    throw new Error("MCP server not found");
                }
                server.enabled = false;
                server.updatedAt = new Date();
                return cloneValue(server);
            },
            async getServerTools(id) {
                return cloneValue(state.mcpToolsByServerId[id] ?? []);
            },
            async updateToolApproval(serverId, toolName, needsApproval) {
                const server = state.mcpServers.find((item) => item.id === serverId);
                if (!server) {
                    throw new Error("MCP server not found");
                }
                const approvals = (server.toolApprovals as Record<string, boolean>) ?? {};
                server.toolApprovals = {
                    ...approvals,
                    [toolName]: needsApproval,
                };
                server.updatedAt = new Date();
                return cloneValue(server);
            },
        },
    };
}

function hasElectronApis(): boolean {
    return typeof window !== "undefined" &&
        typeof window.api !== "undefined" &&
        typeof window.api.chat !== "undefined" &&
        typeof window.api.command !== "undefined" &&
        typeof window.api.persona !== "undefined" &&
        typeof window.api.modelProvider !== "undefined" &&
        typeof window.api.webSearch !== "undefined" &&
        typeof window.api.mcpServer !== "undefined";
}

// Resolve the backend once when the root Redux store is created.
export function resolveAppDataSource(
    options: ResolveAppDataSourceOptions = {}
): AppDataSource {
    const preferredBackend =
        options.preferredBackend ??
        (process.env.NEXT_PUBLIC_COSMO_BACKEND === "http" ||
        process.env.NEXT_PUBLIC_CHAT_DATA_SOURCE === "http" ? "http" : "electron");

    if (preferredBackend === "http") {
        return createHttpAppDataSource();
    }

    if (hasElectronApis()) {
        return createElectronAppDataSource();
    }

    return createDummyHttpAppDataSource();
}
