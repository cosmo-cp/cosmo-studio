import superjson from "superjson";
import type {
    NewChat,
    ModelProviderLite,
    Chat,
    ModelProviderCreateInput,
    NewMessage,
    Message,
    NewModel,
    ProviderWithModels,
    ChatWithMessages,
    ModelIdentifier,
    PersonaIdentifier,
    Persona,
    NewPersona,
    McpServer,
    McpServerCreateInput,
    McpServerUpdateInput,
    McpToolDefinition,
    CommandCreateInput,
    CommandDefinition,
    CommandExecution,
    CommandUpdateInput,
    WebSearchConfigSaveInput,
    WebSearchConfigView,
} from "core/dto";
import type {WebSearchProviderTypeEnum} from "core/database/schema/webSearchConfigSchema";
import type {UIMessage} from "ai";

type RpcEnvelope<T> =
    | {ok: true; result: T}
    | {ok: false; error: {code: string; message: string}};

const apiBase = process.env.NEXT_PUBLIC_COSMO_API_BASE ?? "/api";

function buildRpcUrl(group: string, handler: string): string {
    const base = apiBase.endsWith("/") ? apiBase.slice(0, -1) : apiBase;
    return `${base}/rpc/${group}/${handler}`;
}

async function callRpc<T>(group: string, handler: string, args: unknown[]): Promise<T> {
    const response = await fetch(buildRpcUrl(group, handler), {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: superjson.stringify({args}),
    });
    const envelope = superjson.parse<RpcEnvelope<T>>(await response.text());
    if (!envelope.ok) {
        throw new Error(envelope.error.message || "HTTP RPC request failed.");
    }
    if (!response.ok) {
        throw new Error(response.statusText || "HTTP RPC request failed.");
    }
    return envelope.result;
}

export interface ChatHttpApi {
    getAllChats(searchQuery: string | null): Promise<Chat[]>;
    getChatById(id: string): Promise<ChatWithMessages | undefined>;
    createChat(newChat: NewChat): Promise<void>;
    updateChat(id: string, updates: Partial<NewChat>): Promise<Chat>;
    deleteChat(id: string): Promise<void>;
    updatePinnedStatusForChat(id: string, pinned: boolean): Promise<void>;
    getSelectedModelForChat(id: string): Promise<string | null>;
    updateSelectedModelForChat(id: string, modelIdentifier: ModelIdentifier): Promise<void>;
    updateSelectedPersonaForChat(id: string, personaIdentifier: PersonaIdentifier): Promise<void>;
    updateSelectedChat(id: string): Promise<void>;
}

export interface ModelProviderHttpApi {
    addProvider(providerData: ModelProviderCreateInput, models: NewModel[]): Promise<ProviderWithModels>;
    getProviderForId(providerId: string): Promise<ProviderWithModels | undefined>;
    getProviders(): Promise<ModelProviderLite[]>;
    getProvidersWithModels(): Promise<ProviderWithModels[]>;
    deleteProvider(providerId: string): Promise<void>;
    updateProvider(providerId: string, updateObject: Partial<ModelProviderCreateInput>, modelsData: NewModel[]): Promise<ProviderWithModels>;
    getAvailableModelsFromProviders(provider: ModelProviderCreateInput): Promise<NewModel[]>;
}

export interface MessageHttpApi {
    getByChat(chatId: string): Promise<UIMessage[]>;
    save(newMessage: NewMessage): Promise<Message>;
    update(id: string, updates: Partial<NewMessage>): Promise<void>;
    delete(id: string): Promise<void>;
}

export interface PersonaHttpApi {
    getAll(): Promise<Persona[]>;
    getById(id: string): Promise<Persona | undefined>;
    getByName(name: string): Promise<Persona | undefined>;
    create(newPersona: NewPersona): Promise<Persona>;
    update(id: string, updates: Partial<NewPersona>): Promise<Persona>;
    delete(id: string): Promise<void>;
}

export interface CommandHttpApi {
    listAll(): Promise<CommandDefinition[]>;
    create(input: CommandCreateInput): Promise<CommandDefinition>;
    update(id: string, updates: CommandUpdateInput): Promise<CommandDefinition>;
    delete(id: string): Promise<void>;
    execute(input: {input: string}): Promise<CommandExecution>;
}

export interface McpServerHttpApi {
    getAll(): Promise<McpServer[]>;
    getAllEnabled(): Promise<McpServer[]>;
    getById(id: string): Promise<McpServer | undefined>;
    getByName(name: string): Promise<McpServer | undefined>;
    create(data: McpServerCreateInput): Promise<McpServer>;
    update(id: string, updates: McpServerUpdateInput): Promise<McpServer>;
    delete(id: string): Promise<void>;
    enable(id: string): Promise<McpServer>;
    disable(id: string): Promise<McpServer>;
    refreshClient(id: string): Promise<void>;
    getClientCount(): Promise<number>;
    getServerTools(id: string): Promise<McpToolDefinition[]>;
    updateToolApproval(serverId: string, toolName: string, needsApproval: boolean): Promise<McpServer>;
}

export interface WebSearchHttpApi {
    getConfig(type: WebSearchProviderTypeEnum): Promise<WebSearchConfigView | null>;
    saveConfig(input: WebSearchConfigSaveInput): Promise<WebSearchConfigView>;
    deleteConfig(type: WebSearchProviderTypeEnum): Promise<void>;
}

export interface WorkflowHttpApi {
    list(searchQuery: string | null): Promise<Workflow[]>;
    get(id: string): Promise<Workflow | undefined>;
    create(input: WorkflowCreateInput, graph: WorkflowGraph): Promise<Workflow>;
    update(id: string, updates: Partial<WorkflowCreateInput>): Promise<Workflow | undefined>;
    delete(id: string): Promise<void>;
    saveGraph(id: string, graph: WorkflowGraph): Promise<WorkflowVersion>;
    runStart(input: z.infer<typeof workflowRunStartSchema>): Promise<WorkflowRun>;
    runCancel(input: z.infer<typeof workflowRunCancelSchema>): Promise<WorkflowRun | undefined>;
    runGet(input: z.infer<typeof workflowRunGetSchema>): Promise<WorkflowRunStatusTimeline>;
}

export interface HttpApi {
  chat: ChatHttpApi;
  modelProvider: ModelProviderHttpApi;
  message: MessageHttpApi;
  persona: PersonaHttpApi;
  command: CommandHttpApi;
  mcpServer: McpServerHttpApi;
  webSearch: WebSearchHttpApi;
  workflow: WorkflowHttpApi;
}

export const httpApi: HttpApi = {
  chat: {
    getAllChats: (searchQuery: string | null) => callRpc<Chat[]>('chat', 'getAllChats', [searchQuery]),
    getChatById: (id: string) => callRpc<ChatWithMessages | undefined>('chat', 'getChatById', [id]),
    createChat: (newChat: NewChat) => callRpc<void>('chat', 'createChat', [newChat]),
    updateChat: (id: string, updates: Partial<NewChat>) => callRpc<Chat>('chat', 'updateChat', [id, updates]),
    deleteChat: (id: string) => callRpc<void>('chat', 'deleteChat', [id]),
    updatePinnedStatusForChat: (id: string, pinned: boolean) => callRpc<void>('chat', 'updatePinnedStatusForChat', [id, pinned]),
    getSelectedModelForChat: (id: string) => callRpc<string | null>('chat', 'getSelectedModelForChat', [id]),
    updateSelectedModelForChat: (id: string, modelIdentifier: ModelIdentifier) => callRpc<void>('chat', 'updateSelectedModelForChat', [id, modelIdentifier]),
    updateSelectedPersonaForChat: (id: string, personaIdentifier: PersonaIdentifier) => callRpc<void>('chat', 'updateSelectedPersonaForChat', [id, personaIdentifier]),
    updateSelectedChat: (id: string) => callRpc<void>('chat', 'updateSelectedChat', [id])
  },
  modelProvider: {
    addProvider: (providerData: ModelProviderCreateInput, models: NewModel[]) => callRpc<ProviderWithModels>('modelProvider', 'addProvider', [providerData, models]),
    getProviderForId: (providerId: string) => callRpc<ProviderWithModels | undefined>('modelProvider', 'getProviderForId', [providerId]),
    getProviders: () => callRpc<ModelProviderLite[]>('modelProvider', 'getProviders', []),
    getProvidersWithModels: () => callRpc<ProviderWithModels[]>('modelProvider', 'getProvidersWithModels', []),
    deleteProvider: (providerId: string) => callRpc<void>('modelProvider', 'deleteProvider', [providerId]),
    updateProvider: (providerId: string, updateObject: Partial<ModelProviderCreateInput>, modelsData: NewModel[]) => callRpc<ProviderWithModels>('modelProvider', 'updateProvider', [providerId, updateObject, modelsData]),
    getAvailableModelsFromProviders: (provider: ModelProviderCreateInput) => callRpc<NewModel[]>('modelProvider', 'getAvailableModelsFromProviders', [provider])
  },
  message: {
    getByChat: (chatId: string) => callRpc<UIMessage[]>('message', 'getByChat', [chatId]),
    save: (newMessage: NewMessage) => callRpc<Message>('message', 'save', [newMessage]),
    update: (id: string, updates: Partial<NewMessage>) => callRpc<void>('message', 'update', [id, updates]),
    delete: (id: string) => callRpc<void>('message', 'delete', [id])
  },
  persona: {
    getAll: () => callRpc<Persona[]>('persona', 'getAll', []),
    getById: (id: string) => callRpc<Persona | undefined>('persona', 'getById', [id]),
    getByName: (name: string) => callRpc<Persona | undefined>('persona', 'getByName', [name]),
    create: (newPersona: NewPersona) => callRpc<Persona>('persona', 'create', [newPersona]),
    update: (id: string, updates: Partial<NewPersona>) => callRpc<Persona>('persona', 'update', [id, updates]),
    delete: (id: string) => callRpc<void>('persona', 'delete', [id])
  },
  command: {
    listAll: () => callRpc<CommandDefinition[]>('command', 'listAll', []),
    create: (input: CommandCreateInput) => callRpc<CommandDefinition>('command', 'create', [input]),
    update: (id: string, updates: CommandUpdateInput) => callRpc<CommandDefinition>('command', 'update', [id, updates]),
    delete: (id: string) => callRpc<void>('command', 'delete', [id]),
    execute: (input: {input: string}) => callRpc<CommandExecution>('command', 'execute', [input])
  },
  mcpServer: {
    getAll: () => callRpc<McpServer[]>('mcpServer', 'getAll', []),
    getAllEnabled: () => callRpc<McpServer[]>('mcpServer', 'getAllEnabled', []),
    getById: (id: string) => callRpc<McpServer | undefined>('mcpServer', 'getById', [id]),
    getByName: (name: string) => callRpc<McpServer | undefined>('mcpServer', 'getByName', [name]),
    create: (data: McpServerCreateInput) => callRpc<McpServer>('mcpServer', 'create', [data]),
    update: (id: string, updates: McpServerUpdateInput) => callRpc<McpServer>('mcpServer', 'update', [id, updates]),
    delete: (id: string) => callRpc<void>('mcpServer', 'delete', [id]),
    enable: (id: string) => callRpc<McpServer>('mcpServer', 'enable', [id]),
    disable: (id: string) => callRpc<McpServer>('mcpServer', 'disable', [id]),
    refreshClient: (id: string) => callRpc<void>('mcpServer', 'refreshClient', [id]),
    getClientCount: () => callRpc<number>('mcpServer', 'getClientCount', []),
    getServerTools: (id: string) => callRpc<McpToolDefinition[]>('mcpServer', 'getServerTools', [id]),
    updateToolApproval: (serverId: string, toolName: string, needsApproval: boolean) => callRpc<McpServer>('mcpServer', 'updateToolApproval', [serverId, toolName, needsApproval])
  },
  webSearch: {
    getConfig: (type: WebSearchProviderTypeEnum) => callRpc<WebSearchConfigView | null>('webSearch', 'getConfig', [type]),
    saveConfig: (input: WebSearchConfigSaveInput) => callRpc<WebSearchConfigView>('webSearch', 'saveConfig', [input]),
    deleteConfig: (type: WebSearchProviderTypeEnum) => callRpc<void>('webSearch', 'deleteConfig', [type])
  },
  workflow: {
    list: (searchQuery: string | null) => callRpc<Workflow[]>('workflow', 'list', [searchQuery]),
    get: (id: string) => callRpc<Workflow | undefined>('workflow', 'get', [id]),
    create: (input: WorkflowCreateInput, graph: WorkflowGraph) => callRpc<Workflow>('workflow', 'create', [input, graph]),
    update: (id: string, updates: Partial<WorkflowCreateInput>) => callRpc<Workflow | undefined>('workflow', 'update', [id, updates]),
    delete: (id: string) => callRpc<void>('workflow', 'delete', [id]),
    saveGraph: (id: string, graph: WorkflowGraph) => callRpc<WorkflowVersion>('workflow', 'saveGraph', [id, graph]),
    runStart: (input: z.infer<typeof workflowRunStartSchema>) => callRpc<WorkflowRun>('workflow', 'run.start', [input]),
    runCancel: (input: z.infer<typeof workflowRunCancelSchema>) => callRpc<WorkflowRun | undefined>('workflow', 'run.cancel', [input]),
    runGet: (input: z.infer<typeof workflowRunGetSchema>) => callRpc<WorkflowRunStatusTimeline>('workflow', 'run.get', [input])
  },
};
