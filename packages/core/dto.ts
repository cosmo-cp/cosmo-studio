import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { chat, mcpServer, message, model, modelProvider, persona, command } from './database/schema/schema';
import { UIMessage } from 'ai';

type Optional<T, K extends keyof T> = Omit<T, K> & Pick<Partial<T>, K>;

//full entity based dto
export type Message = InferSelectModel<typeof message>;
export type Chat = InferSelectModel<typeof chat>;

// DTOs for new database entry
export type NewChat = InferInsertModel<typeof chat>;
export type NewMessage = InferInsertModel<typeof message>;

// The full model, retrieved from the database with a decrypted apiKey.
export type ModelProvider = InferSelectModel<typeof modelProvider>;
// The raw type used for inserting a record into the database.
export type ModelProviderInsert = InferInsertModel<typeof modelProvider>;

// New type for user input, omitting DB-managed fields.
export type ModelProviderCreateInput = Omit<ModelProviderInsert, 'id' | 'createdAt' | 'updatedAt'>;

// The safe model for sending to the renderer process (no API key).
export type ModelProviderLite = Optional<ModelProvider, 'apiKey'>;
export type ModelIdentifier = Pick<Chat, 'selectedProvider' | 'selectedModelId'>;
export type PersonaIdentifier = Pick<Chat, 'selectedPersonaId'>;

// Simple Model interface (kept here for full context)
export type Model = InferSelectModel<typeof model>;
export type ModelInsert = InferInsertModel<typeof model>;

export type NewModel = Omit<Model, 'id' | 'createdAt' | 'updatedAt' | 'providerId'>;
export type ModelLite = Omit<Model, 'providerId'>;

export type Persona = InferSelectModel<typeof persona>;
export type NewPersona = InferInsertModel<typeof persona>;
export type PersonaCreateInput = Omit<NewPersona, 'id' | 'createdAt' | 'updatedAt'>;

export type Command = InferSelectModel<typeof command>;
export type NewCommand = InferInsertModel<typeof command>;
export type CommandCreateInput = Omit<NewCommand, 'id' | 'createdAt' | 'updatedAt'>;
export type CommandUpdateInput = Partial<CommandCreateInput>;

export interface CommandDefinition {
    id?: string;
    name: string;
    description: string;
    template: string;
    argumentLabel?: string | null;
    builtIn: boolean;
}

export interface CommandExecution {
    name: string;
    argument?: string;
    resolvedText: string;
}

export type ProviderWithModels = ModelProviderLite & {
    models: ModelLite[];
};

export type ChatWithMessages = Chat & {
    messages: UIMessage[];
};

export interface ChatSendMessageArgs {
    chatId: string;
    messages: UIMessage[];
    streamChannel: string;
    modelIdentifier: string & {};
    personaId?: string;
    personaName?: string;
}

export interface ChatAbortArgs {
    streamChannel: string;
}

// MCP Server Transport Configurations
export interface SseTransportConfig {
    url: string;
    headers?: Record<string, string>;
}

export interface HttpTransportConfig {
    url: string;
    headers?: Record<string, string>;
}

export interface StdioTransportConfig {
    command: string;
    args?: string[];
    env?: Record<string, string>;
    cwd?: string;
}

export type McpTransportConfig = SseTransportConfig | HttpTransportConfig | StdioTransportConfig;

// MCP Server DTOs
export type McpServer = InferSelectModel<typeof mcpServer>;
export type McpServerInsert = InferInsertModel<typeof mcpServer>;
export type McpServerCreateInput = Omit<McpServerInsert, 'id' | 'createdAt' | 'updatedAt'>;
export type McpServerUpdateInput = Partial<Omit<McpServerInsert, 'id' | 'createdAt' | 'updatedAt'>>;
