import type { SecretStore } from 'core/platform/SecretStore';
import { CORETYPES } from 'core/types/types';
import { Container } from 'inversify';
import { coreContainer } from '../../packages/core/inversify.config';
import { AcpAgentController } from './controllers/AcpAgentController';
import { ChatController } from './controllers/ChatController';
import { CommandController } from './controllers/CommandController';
import { Controller } from './controllers/Controller';
import { McpServerController } from './controllers/McpServerController';
import { MessageController } from './controllers/MessageController';
import { ModelProviderController } from './controllers/ModelProviderController';
import { PersonaController } from './controllers/PersonaController';
import { StreamingChatController } from './controllers/StreamingChatController';
import { WebSearchController } from './controllers/WebSearchController';
import { WorkflowController } from './controllers/WorkflowController';
import { IpcHandlerRegistry } from './ipc';
import { ElectronSecretStore } from './platform/ElectronSecretStore';
import { AcpAgentRuntimeService } from './services/AcpAgentRuntimeService';
import { ChatStreamingService } from './services/ChatStreamingService';
import { WorkflowExecutionService } from './services/WorkflowExecutionService';
import { WorkflowRunStreamingService } from './services/WorkflowRunStreamingService';
import { TYPES } from './types';

const container = new Container({ parent: coreContainer });

coreContainer.rebindSync<SecretStore>(CORETYPES.SecretStore).to(ElectronSecretStore).inSingletonScope();

container.bind<IpcHandlerRegistry>(TYPES.IpcHandlerRegistry).to(IpcHandlerRegistry).inSingletonScope();
container.bind<ChatStreamingService>(TYPES.ChatStreamingService).to(ChatStreamingService).inSingletonScope();
container.bind<AcpAgentRuntimeService>(TYPES.AcpAgentRuntimeService).to(AcpAgentRuntimeService).inSingletonScope();
container
    .bind<WorkflowRunStreamingService>(TYPES.WorkflowRunStreamingService)
    .to(WorkflowRunStreamingService)
    .inSingletonScope();
container
    .bind<WorkflowExecutionService>(TYPES.WorkflowExecutionService)
    .to(WorkflowExecutionService)
    .inSingletonScope();

// Bind controllers
container.bind<Controller>(TYPES.Controller).to(ChatController).inSingletonScope();
container.bind<Controller>(TYPES.Controller).to(ModelProviderController).inSingletonScope();
container.bind<Controller>(TYPES.Controller).to(StreamingChatController).inSingletonScope();
container.bind<Controller>(TYPES.Controller).to(MessageController).inSingletonScope();
container.bind<Controller>(TYPES.Controller).to(PersonaController).inSingletonScope();
container.bind<Controller>(TYPES.Controller).to(CommandController).inSingletonScope();
container.bind<Controller>(TYPES.Controller).to(McpServerController).inSingletonScope();
container.bind<Controller>(TYPES.Controller).to(WebSearchController).inSingletonScope();
container.bind<Controller>(TYPES.Controller).to(WorkflowController).inSingletonScope();
container.bind<Controller>(TYPES.Controller).to(AcpAgentController).inSingletonScope();

export default container;
