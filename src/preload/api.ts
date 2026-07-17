import { chatApi, type ChatApi } from './api/chat';
import { modelProviderApi, type ModelProviderApi } from './api/modelProvider';
import { messageApi, type MessageApi } from './api/message';
import { personaApi, type PersonaApi } from './api/persona';
import { commandApi, type CommandApi } from './api/command';
import { mcpServerApi, type McpServerApi } from './api/mcpServer';
import { webSearchApi, type WebSearchApi } from './api/webSearch';
import { workflowApi, type WorkflowApi } from './api/workflow';
import { acpAgentApi, type AcpAgentApi } from './api/acpAgent';
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

export interface Api {
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

export const api: Api = {
  chat: chatApi,
  modelProvider: modelProviderApi,
  message: messageApi,
  persona: personaApi,
  command: commandApi,
  mcpServer: mcpServerApi,
  webSearch: webSearchApi,
  workflow: workflowApi,
  acpAgent: acpAgentApi,
  streaming: streamingApi,
};
