import type { AcpAgentApi } from './contracts/acpAgent';
import type { ChatApi } from './contracts/chat';
import type { CommandApi } from './contracts/command';
import type { McpServerApi } from './contracts/mcpServer';
import type { MessageApi } from './contracts/message';
import type { ModelProviderApi } from './contracts/modelProvider';
import type { PersonaApi } from './contracts/persona';
import type { StreamingApi } from './contracts/streaming';
import type { WebSearchApi } from './contracts/webSearch';
import type { WorkflowApi } from './contracts/workflow';
import { acpAgentHttpApi } from './http-api/acpAgent';
import { chatHttpApi } from './http-api/chat';
import { commandHttpApi } from './http-api/command';
import { mcpServerHttpApi } from './http-api/mcpServer';
import { messageHttpApi } from './http-api/message';
import { modelProviderHttpApi } from './http-api/modelProvider';
import { personaHttpApi } from './http-api/persona';
import { streamingHttpApi } from './http-api/streaming';
import { webSearchHttpApi } from './http-api/webSearch';
import { workflowHttpApi } from './http-api/workflow';

export type { ChatApi } from './contracts/chat';
export type { ModelProviderApi } from './contracts/modelProvider';
export type { MessageApi } from './contracts/message';
export type { PersonaApi } from './contracts/persona';
export type { CommandApi } from './contracts/command';
export type { McpServerApi } from './contracts/mcpServer';
export type { WebSearchApi } from './contracts/webSearch';
export type { WorkflowApi } from './contracts/workflow';
export type { AcpAgentApi } from './contracts/acpAgent';
export type { StreamingApi } from './contracts/streaming';

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
    streaming: streamingHttpApi,
};
