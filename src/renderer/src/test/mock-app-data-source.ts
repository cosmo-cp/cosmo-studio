import type { AppThunkExtra } from '@/lib/store/store';

type AppDataSource = AppThunkExtra['appDataSource'];

type AppDataSourceOverrides = {
    chat?: Partial<AppDataSource['chat']>;
    message?: Partial<AppDataSource['message']>;
    command?: Partial<AppDataSource['command']>;
    persona?: Partial<AppDataSource['persona']>;
    modelProvider?: Partial<AppDataSource['modelProvider']>;
    webSearch?: Partial<AppDataSource['webSearch']>;
    mcpServer?: Partial<AppDataSource['mcpServer']>;
    acpAgent?: Partial<AppDataSource['acpAgent']>;
    workflow?: Partial<AppDataSource['workflow']>;
    streaming?: Partial<AppDataSource['streaming']>;
};

export function createMockAppDataSource(overrides: AppDataSourceOverrides = {}): AppDataSource {
    return {
        chat: {
            getAllChats: async () => [],
            getChatById: async () => undefined,
            createChat: async () => undefined,
            updateChat: async () => {
                throw new Error('chat.updateChat not mocked');
            },
            updateSelectedChat: async () => undefined,
            deleteChat: async () => undefined,
            updatePinnedStatusForChat: async () => undefined,
            getSelectedModelForChat: async () => null,
            updateSelectedModelForChat: async () => undefined,
            updateSelectedAgentForChat: async () => undefined,
            updateSelectedPersonaForChat: async () => undefined,
            ...overrides.chat,
        },
        message: {
            getByChat: async () => [],
            save: async () => {
                throw new Error('message.save not mocked');
            },
            update: async () => undefined,
            delete: async () => undefined,
            ...overrides.message,
        },
        command: {
            listAll: async () => [],
            create: async () => {
                throw new Error('command.create not mocked');
            },
            update: async () => {
                throw new Error('command.update not mocked');
            },
            delete: async () => undefined,
            execute: async () => ({
                name: '/noop',
                resolvedText: '',
            }),
            ...overrides.command,
        },
        persona: {
            getAll: async () => [],
            getById: async () => undefined,
            getByName: async () => undefined,
            create: async () => {
                throw new Error('persona.create not mocked');
            },
            update: async () => {
                throw new Error('persona.update not mocked');
            },
            delete: async () => undefined,
            ...overrides.persona,
        },
        modelProvider: {
            getProviderForId: async () => undefined,
            getProviders: async () => [],
            getProvidersWithModels: async () => [],
            getAvailableModelsFromProviders: async () => [],
            addProvider: async () => {
                throw new Error('modelProvider.addProvider not mocked');
            },
            updateProvider: async () => {
                throw new Error('modelProvider.updateProvider not mocked');
            },
            deleteProvider: async () => undefined,
            ...overrides.modelProvider,
        },
        webSearch: {
            getConfig: async () => null,
            saveConfig: async () => {
                throw new Error('webSearch.saveConfig not mocked');
            },
            deleteConfig: async () => undefined,
            ...overrides.webSearch,
        },
        mcpServer: {
            getAll: async () => [],
            getAllEnabled: async () => [],
            getById: async () => undefined,
            getByName: async () => undefined,
            create: async () => {
                throw new Error('mcpServer.create not mocked');
            },
            update: async () => {
                throw new Error('mcpServer.update not mocked');
            },
            delete: async () => undefined,
            enable: async () => {
                throw new Error('mcpServer.enable not mocked');
            },
            disable: async () => {
                throw new Error('mcpServer.disable not mocked');
            },
            refreshClient: async () => undefined,
            getClientCount: async () => 0,
            getServerTools: async () => [],
            updateToolApproval: async () => {
                throw new Error('mcpServer.updateToolApproval not mocked');
            },
            ...overrides.mcpServer,
        },
        acpAgent: {
            getAll: async () => [],
            create: async () => {
                throw new Error('acpAgent.create not mocked');
            },
            update: async () => {
                throw new Error('acpAgent.update not mocked');
            },
            delete: async () => undefined,
            enable: async () => {
                throw new Error('acpAgent.enable not mocked');
            },
            disable: async () => {
                throw new Error('acpAgent.disable not mocked');
            },
            getRegistry: async () => ({ version: 'test', fetchedAt: null, agents: [] }),
            refreshRegistry: async () => ({ version: 'test', fetchedAt: new Date(), agents: [] }),
            installFromRegistry: async () => {
                throw new Error('acpAgent.installFromRegistry not mocked');
            },
            test: async () => ({ ok: true, message: 'ok' }),
            ...overrides.acpAgent,
        },
        workflow: {
            list: async () => [],
            get: async () => undefined,
            create: async (input) => ({
                id: crypto.randomUUID(),
                title: input.title,
                summary: input.summary ?? null,
                status: 'active',
                latestVersion: 1,
                createdAt: new Date(),
                updatedAt: new Date(),
            }),
            update: async () => undefined,
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
                    status: 'queued',
                    startedAt: now,
                    completedAt: null,
                    errorMessage: null,
                    createdAt: now,
                    updatedAt: now,
                };
            },
            runCancel: async () => undefined,
            runGet: async () => undefined,
            ...overrides.workflow,
        },
        streaming: {
            sendMessage: () => undefined,
            abortMessage: () => undefined,
            runStreamStart: () => undefined,
            runStreamAbort: () => undefined,
            onData: () => undefined,
            onEnd: () => undefined,
            onError: () => undefined,
            removeListeners: () => undefined,
            ...overrides.streaming,
        },
    };
}
