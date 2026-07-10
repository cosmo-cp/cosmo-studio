import { chatApi } from './api/chat';
import { modelProviderApi } from './api/modelProvider';
import { messageApi } from './api/message';
import { personaApi } from './api/persona';
import { commandApi } from './api/command';
import { mcpServerApi } from './api/mcpServer';
import { webSearchApi } from './api/webSearch';
import { workflowApi } from './api/workflow';
import { acpAgentApi } from './api/acpAgent';
import { streamingApi } from './api/streaming';
import type { ChatApi } from './api/chat';
import type { ModelProviderApi } from './api/modelProvider';
import type { MessageApi } from './api/message';
import type { PersonaApi } from './api/persona';
import type { CommandApi } from './api/command';
import type { McpServerApi } from './api/mcpServer';
import type { WebSearchApi } from './api/webSearch';
import type { WorkflowApi } from './api/workflow';
import type { AcpAgentApi } from './api/acpAgent';
import type { StreamingApi } from './api/streaming';

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
