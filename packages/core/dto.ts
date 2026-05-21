import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import {
    chat,
    command,
    acpAgent,
    acpRegistryCache,
    mcpServer,
    message,
    model,
    modelProvider,
    persona,
    webSearchConfig,
    workflow,
    workflowRun,
    workflowRunEvent,
    workflowVersion,
} from './database/schema/schema';
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
export type ChatRuntime = 'model' | 'agent';
export type AgentIdentifier = Pick<Chat, 'selectedAgentId' | 'selectedRuntime'>;

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

export interface McpToolDefinition {
    name: string;
    title?: string;
    description?: string;
}

export type ProviderWithModels = ModelProviderLite & {
    models: ModelLite[];
};

export type WebSearchConfig = InferSelectModel<typeof webSearchConfig>;
export type WebSearchConfigInsert = InferInsertModel<typeof webSearchConfig>;
export type WebSearchConfigCreateInput = Omit<
    WebSearchConfigInsert,
    'id' | 'createdAt' | 'updatedAt'
>;
export interface WebSearchConfigView {
    id: string;
    createdAt: Date;
    updatedAt: Date | null;
    type: WebSearchConfig["type"];
    enabled: boolean;
    hasApiKey: boolean;
}
export interface WebSearchConfigSaveInput {
    type: WebSearchConfig["type"];
    enabled: boolean;
    apiKey?: string | null;
}

export type ChatWithMessages = Chat & {
    messages: UIMessage[];
};

export interface ChatSendMessageArgs {
    chatId: string;
    messages: UIMessage[];
    streamChannel: string;
    modelIdentifier?: string;
    personaId?: string;
    personaName?: string;
    runtime?: ChatRuntime;
    agentId?: string | null;
    agentCwd?: string | null;
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

export type AcpAgent = InferSelectModel<typeof acpAgent>;
export type AcpAgentInsert = InferInsertModel<typeof acpAgent>;
export type AcpRegistryCache = InferSelectModel<typeof acpRegistryCache>;
export type AcpRegistryCacheInsert = InferInsertModel<typeof acpRegistryCache>;
export type AcpAgentCreateInput = Omit<AcpAgentInsert, 'id' | 'createdAt' | 'updatedAt'>;
export type AcpAgentUpdateInput = Partial<AcpAgentCreateInput>;

export interface AcpAgentView extends Omit<AcpAgent, 'env'> {
    envKeys: string[];
}

export interface AcpAgentRuntimeConfig extends AcpAgent {
    env: Record<string, string>;
}

export interface AcpRegistryAgent {
    id: string;
    name: string;
    version: string;
    description?: string;
    repository?: string;
    website?: string;
    authors?: string[];
    license?: string;
    icon?: string;
    distribution: Record<string, unknown>;
}

export interface AcpRegistryView {
    version: string;
    fetchedAt: Date | null;
    agents: AcpRegistryAgent[];
}

export interface AcpRegistryInstallInput {
    registryId: string;
    defaultCwd?: string | null;
    authMethodId?: string | null;
    enabled?: boolean;
    mcpServerIds?: string[];
}

export interface AcpAgentTestResult {
    ok: boolean;
    message: string;
    authMethods?: string[];
}


export interface WorkflowGraph {
    nodes: Record<string, unknown>[];
    edges: Record<string, unknown>[];
    config?: Record<string, unknown>;
}

export type Workflow = InferSelectModel<typeof workflow>;
export type WorkflowInsert = InferInsertModel<typeof workflow>;
export type WorkflowCreateInput = Omit<WorkflowInsert, 'id' | 'createdAt' | 'updatedAt' | 'latestVersion' | 'status'>;

export type WorkflowVersion = InferSelectModel<typeof workflowVersion>;
export type WorkflowVersionInsert = InferInsertModel<typeof workflowVersion>;

export type WorkflowRun = InferSelectModel<typeof workflowRun>;
export type WorkflowRunInsert = InferInsertModel<typeof workflowRun>;

export type WorkflowRunEvent = InferSelectModel<typeof workflowRunEvent>;
export type WorkflowRunEventInsert = InferInsertModel<typeof workflowRunEvent>;
export type WorkflowRunStatus = WorkflowRun & { events: WorkflowRunEvent[] };

export type WorkflowRunStreamEventType =
    | 'step.started'
    | 'step.completed'
    | 'tool.call'
    | 'approval.required'
    | 'error'
    | 'finished';

export interface WorkflowRunStreamEventEnvelope {
    runId: string;
    type: WorkflowRunStreamEventType;
    timestamp: string;
    sequence: number;
    payload?: Record<string, unknown>;
    message?: string;
}

export interface WorkflowRunStreamStartArgs {
    runId: string;
    streamChannel: string;
    afterSequence?: number;
}

export interface WorkflowRunStreamAbortArgs {
    streamChannel: string;
}
