import type { CosmoApi } from './api';
import { acpAgentApi as acpAgentRpcApi } from './api/acpAgent';
import { chatApi as chatRpcApi } from './api/chat';
import { commandApi as commandRpcApi } from './api/command';
import { mcpServerApi as mcpServerRpcApi } from './api/mcpServer';
import { messageApi as messageRpcApi } from './api/message';
import { modelProviderApi as modelProviderRpcApi } from './api/modelProvider';
import { personaApi as personaRpcApi } from './api/persona';
import { streamingApi } from './api/streaming';
import { webSearchApi as webSearchRpcApi } from './api/webSearch';
import { workflowApi as workflowRpcApi } from './api/workflow';

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
