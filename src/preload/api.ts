import { ipcRenderer } from 'electron';
import {
    NewChat,
    ModelProviderLite,
    ChatAbortArgs,
    ChatSendMessageArgs,
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
    ChatMessageSyncInput,
    ChatMessageSyncAck,
    CommandCreateInput,
    CommandDefinition,
    CommandExecution,
    CommandUpdateInput,
} from '../../packages/core/dto';
import { UIMessage, UIMessageChunk } from 'ai';
export interface ChatApi {
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

export interface ModelProviderApi {
    addProvider(providerData: ModelProviderCreateInput, models: NewModel[]): Promise<ProviderWithModels>;
    getProviderForId(providerId: string): Promise<ProviderWithModels | undefined>;
    getProviders(): Promise<ModelProviderLite[]>;
    getProvidersWithModels(): Promise<ProviderWithModels[]>;
    deleteProvider(providerId: string): Promise<void>;
    updateProvider(
        providerId: string,
        updateObject: Partial<ModelProviderCreateInput>,
        modelsData: NewModel[],
    ): Promise<ProviderWithModels>;
    getAvailableModelsFromProviders(provider: ModelProviderCreateInput): Promise<NewModel[]>;
}

export interface MessageApi {
    getByChat(chatId: string): Promise<UIMessage[]>;
    syncForChat(input: ChatMessageSyncInput): Promise<ChatMessageSyncAck>;
    save(newMessage: NewMessage): Promise<Message>;
    update(id: string, updates: Partial<NewMessage>): Promise<void>;
    delete(id: string): Promise<void>;
}

export interface PersonaApi {
    getAll(): Promise<Persona[]>;
    getById(id: string): Promise<Persona | undefined>;
    getByName(name: string): Promise<Persona | undefined>;
    create(newPersona: NewPersona): Promise<Persona>;
    update(id: string, updates: Partial<NewPersona>): Promise<Persona>;
    delete(id: string): Promise<void>;
}

export interface CommandApi {
    listAll(): Promise<CommandDefinition[]>;
    create(input: CommandCreateInput): Promise<CommandDefinition>;
    update(id: string, updates: CommandUpdateInput): Promise<CommandDefinition>;
    delete(id: string): Promise<void>;
    execute(input: { input: string }): Promise<CommandExecution>;
}

export interface McpServerApi {
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
    getServerTools(id: string): Promise<Array<{ name: string; title?: string; description?: string }>>;
    updateToolApproval(serverId: string, toolName: string, needsApproval: boolean): Promise<McpServer>;
}

export interface StreamingApi {
    sendMessage(args: ChatSendMessageArgs): void;
    abortMessage(args: ChatAbortArgs): void;
    onData: (channel: string, listener: (data: UIMessageChunk) => void) => void;
    onEnd: (channel: string, listener: () => void) => void;
    onError: (channel: string, listener: (error: unknown) => void) => void;
    removeListeners: (channel: string) => void;
}

export interface Api {
    chat: ChatApi;
    modelProvider: ModelProviderApi;
    message: MessageApi;
    persona: PersonaApi;
    command: CommandApi;
    mcpServer: McpServerApi;
    streaming: StreamingApi;
}

export const api: Api = {
  chat: {
    getAllChats: (searchQuery: string | null) => ipcRenderer.invoke('chat:getAllChats', searchQuery),
    getChatById: (id: string) => ipcRenderer.invoke('chat:getChatById', id),
    createChat: (newChat: NewChat) => ipcRenderer.invoke('chat:createChat', newChat),
    updateChat: (id: string, updates: Partial<NewChat>) => ipcRenderer.invoke('chat:updateChat', id, updates),
    deleteChat: (id: string) => ipcRenderer.invoke('chat:deleteChat', id),
    updatePinnedStatusForChat: (id: string, pinned: boolean) => ipcRenderer.invoke('chat:updatePinnedStatusForChat', id, pinned),
    getSelectedModelForChat: (id: string) => ipcRenderer.invoke('chat:getSelectedModelForChat', id),
    updateSelectedModelForChat: (id: string, modelIdentifier: ModelIdentifier) => ipcRenderer.invoke('chat:updateSelectedModelForChat', id, modelIdentifier),
    updateSelectedPersonaForChat: (id: string, personaIdentifier: PersonaIdentifier) => ipcRenderer.invoke('chat:updateSelectedPersonaForChat', id, personaIdentifier),
    updateSelectedChat: (id: string) => ipcRenderer.invoke('chat:updateSelectedChat', id)
  },
  modelProvider: {
    addProvider: (providerData: ModelProviderCreateInput, models: NewModel[]) => ipcRenderer.invoke('modelProvider:addProvider', providerData, models),
    getProviderForId: (providerId: string) => ipcRenderer.invoke('modelProvider:getProviderForId', providerId),
    getProviders: () => ipcRenderer.invoke('modelProvider:getProviders'),
    getProvidersWithModels: () => ipcRenderer.invoke('modelProvider:getProvidersWithModels'),
    deleteProvider: (providerId: string) => ipcRenderer.invoke('modelProvider:deleteProvider', providerId),
    updateProvider: (providerId: string, updateObject: Partial<ModelProviderCreateInput>, modelsData: NewModel[]) => ipcRenderer.invoke('modelProvider:updateProvider', providerId, updateObject, modelsData),
    getAvailableModelsFromProviders: (provider: ModelProviderCreateInput) => ipcRenderer.invoke('modelProvider:getAvailableModelsFromProviders', provider)
  },
  message: {
    getByChat: (chatId: string) => ipcRenderer.invoke('message:getByChat', chatId),
    syncForChat: (input: ChatMessageSyncInput) => ipcRenderer.invoke('message:syncForChat', input),
    save: (newMessage: NewMessage) => ipcRenderer.invoke('message:save', newMessage),
    update: (id: string, updates: Partial<NewMessage>) => ipcRenderer.invoke('message:update', id, updates),
    delete: (id: string) => ipcRenderer.invoke('message:delete', id)
  },
  persona: {
    getAll: () => ipcRenderer.invoke('persona:getAll'),
    getById: (id: string) => ipcRenderer.invoke('persona:getById', id),
    getByName: (name: string) => ipcRenderer.invoke('persona:getByName', name),
    create: (newPersona: NewPersona) => ipcRenderer.invoke('persona:create', newPersona),
    update: (id: string, updates: Partial<NewPersona>) => ipcRenderer.invoke('persona:update', id, updates),
    delete: (id: string) => ipcRenderer.invoke('persona:delete', id)
  },
  command: {
    listAll: () => ipcRenderer.invoke('command:listAll'),
    create: (input: CommandCreateInput) => ipcRenderer.invoke('command:create', input),
    update: (id: string, updates: CommandUpdateInput) => ipcRenderer.invoke('command:update', id, updates),
    delete: (id: string) => ipcRenderer.invoke('command:delete', id),
    execute: (input: { input: string }) => ipcRenderer.invoke('command:execute', input)
  },
  mcpServer: {
    getAll: () => ipcRenderer.invoke('mcpServer:getAll'),
    getAllEnabled: () => ipcRenderer.invoke('mcpServer:getAllEnabled'),
    getById: (id: string) => ipcRenderer.invoke('mcpServer:getById', id),
    getByName: (name: string) => ipcRenderer.invoke('mcpServer:getByName', name),
    create: (data: McpServerCreateInput) => ipcRenderer.invoke('mcpServer:create', data),
    update: (id: string, updates: McpServerUpdateInput) => ipcRenderer.invoke('mcpServer:update', id, updates),
    delete: (id: string) => ipcRenderer.invoke('mcpServer:delete', id),
    enable: (id: string) => ipcRenderer.invoke('mcpServer:enable', id),
    disable: (id: string) => ipcRenderer.invoke('mcpServer:disable', id),
    refreshClient: (id: string) => ipcRenderer.invoke('mcpServer:refreshClient', id),
    getClientCount: () => ipcRenderer.invoke('mcpServer:getClientCount'),
    getServerTools: (id: string) => ipcRenderer.invoke('mcpServer:getServerTools', id),
    updateToolApproval: (serverId: string, toolName: string, needsApproval: boolean) => ipcRenderer.invoke('mcpServer:updateToolApproval', serverId, toolName, needsApproval)
  },
  streaming: {
    sendMessage: (args: ChatSendMessageArgs) => ipcRenderer.send('streamingChat:sendMessage', args),
    abortMessage: (args: ChatAbortArgs) => ipcRenderer.send('streamingChat:abortMessage', args),
    onData: (channel: string, listener: (data: UIMessageChunk) => void) => {
      const subscription = (_event: unknown, data: UIMessageChunk) => listener(data);
      ipcRenderer.on(`${channel}-data`, subscription);
    },
    onEnd: (channel: string, listener: () => void) => {
      ipcRenderer.on(`${channel}-end`, listener);
    },
    onError: (channel: string, listener: (error: unknown) => void) => {
      const subscription = (_event: unknown, error: unknown) => listener(error);
      ipcRenderer.on(`${channel}-error`, subscription);
    },
    removeListeners: (channel: string) => {
      ipcRenderer.removeAllListeners(`${channel}-error`);
      ipcRenderer.removeAllListeners(`${channel}-end`);
      ipcRenderer.removeAllListeners(`${channel}-data`);
    },
  },
};
