import { type ChatApi, chatHttpApi, chatRpcApi } from './api/chat';
import { type ModelProviderApi, modelProviderHttpApi, modelProviderRpcApi } from './api/modelProvider';
import { type MessageApi, messageHttpApi, messageRpcApi } from './api/message';
import { type PersonaApi, personaHttpApi, personaRpcApi } from './api/persona';
import { type CommandApi, commandHttpApi, commandRpcApi } from './api/command';
import { type McpServerApi, mcpServerHttpApi, mcpServerRpcApi } from './api/mcpServer';
import { type WebSearchApi, webSearchHttpApi, webSearchRpcApi } from './api/webSearch';
import { type WorkflowApi, workflowHttpApi, workflowRpcApi } from './api/workflow';
import { type AcpAgentApi, acpAgentHttpApi, acpAgentRpcApi } from './api/acpAgent';
import { streamingApi, type StreamingApi } from './api/streaming';

export type { ChatApi } from './api/chat';
export type { ModelProviderApi } from './api/modelProvider';
export type { MessageApi } from './api/message';
export type { PersonaApi } from './api/persona';
export type { CommandApi } from './api/command';
export type { McpServerApi } from './api/mcpServer';
export type { WebSearchApi } from './api/webSearch';
export type { WorkflowApi } from './api/workflow';
export type { AcpAgentApi } from './api/acpAgent';
export type { StreamingApi } from './api/streaming';

export interface CosmoApi {
    chat: ChatApi;
    modelProvider: ModelProviderApi;
    message: MessageApi;
    persona: PersonaApi;
    command: CommandApi;
    mcpServer: McpServerApi;
    webSearch: WebSearchApi;
    workflow: WorkflowApi;
    acpAgent: AcpAgentApi;
    streaming: StreamingApi;
}

export const rpcApi: CosmoApi = {
    chat: chatRpcApi,
    modelProvider: modelProviderRpcApi,
    message: messageRpcApi,
    persona: personaRpcApi,
    command: commandRpcApi,
    mcpServer: mcpServerRpcApi,
    webSearch: webSearchRpcApi,
    workflow: workflowRpcApi,
    acpAgent: acpAgentRpcApi,
    streaming: streamingApi,
};

export const httpApi: CosmoApi = {
    chat: chatHttpApi,
    modelProvider: modelProviderHttpApi,
    message: messageHttpApi,
    persona: personaHttpApi,
    command: commandHttpApi,
    mcpServer: mcpServerHttpApi,
    webSearch: webSearchHttpApi,
    workflow: workflowHttpApi,
    acpAgent: acpAgentHttpApi,
    streaming: streamingApi,
};
