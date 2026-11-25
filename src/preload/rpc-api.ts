import type { CosmoApi } from './api';
import { acpAgentApi as acpAgentRpcApi } from './api/acpAgent';
import { chatApi as chatRpcApi } from './api/chat';
import { commandApi as commandRpcApi } from './api/command';
import { guardrailsApi as guardrailsRpcApi } from './api/guardrails';
import { mcpServerApi as mcpServerRpcApi } from './api/mcpServer';
import { messageApi as messageRpcApi } from './api/message';
import { modelProviderApi as modelProviderRpcApi } from './api/modelProvider';
import { personaApi as personaRpcApi } from './api/persona';
import { skillApi as skillRpcApi } from './api/skill';
import { streamingApi } from './api/streaming';
import { taskApi as taskRpcApi } from './api/task';
import { userApi as userRpcApi } from './api/user';
import { webSearchApi as webSearchRpcApi } from './api/webSearch';
import { workflowApi as workflowRpcApi } from './api/workflow';
import { workspaceApi as workspaceRpcApi } from './api/workspace';

export const rpcApi: CosmoApi = {
    chat: chatRpcApi,
    modelProvider: modelProviderRpcApi,
    message: messageRpcApi,
    persona: personaRpcApi,
    skill: skillRpcApi,
    command: commandRpcApi,
    mcpServer: mcpServerRpcApi,
    webSearch: webSearchRpcApi,
    workflow: workflowRpcApi,
    acpAgent: acpAgentRpcApi,
    task: taskRpcApi,
    workspace: workspaceRpcApi,
    user: userRpcApi,
    guardrails: guardrailsRpcApi,
    streaming: streamingApi,
};
