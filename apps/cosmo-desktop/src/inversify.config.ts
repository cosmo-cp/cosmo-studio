import { AcpAgentController } from 'backend-common/controllers/AcpAgentController';
import { ChatController } from 'backend-common/controllers/ChatController';
import { CommandController } from 'backend-common/controllers/CommandController';
import { Controller } from 'backend-common/controllers/Controller';
import { GuardrailsController } from 'backend-common/controllers/GuardrailsController';
import { McpServerController } from 'backend-common/controllers/McpServerController';
import { MessageController } from 'backend-common/controllers/MessageController';
import { ModelProviderController } from 'backend-common/controllers/ModelProviderController';
import { PersonaController } from 'backend-common/controllers/PersonaController';
import { SkillController } from 'backend-common/controllers/SkillController';
import { StreamingChatController } from 'backend-common/controllers/StreamingChatController';
import { TaskController } from 'backend-common/controllers/TaskController';
import { UserController } from 'backend-common/controllers/UserController';
import { WebSearchController } from 'backend-common/controllers/WebSearchController';
import { WorkflowController } from 'backend-common/controllers/WorkflowController';
import { WorkspaceController } from 'backend-common/controllers/WorkspaceController';
import { AcpAgentRuntimeService } from 'backend-common/services/AcpAgentRuntimeService';
import { ChatStreamingService } from 'backend-common/services/ChatStreamingService';
import { TaskExecutionService } from 'backend-common/services/TaskExecutionService';
import { WorkflowExecutionService } from 'backend-common/services/WorkflowExecutionService';
import { WorkflowRunStreamingService } from 'backend-common/services/WorkflowRunStreamingService';
import { WorkspaceExecutionLockService } from 'backend-common/services/WorkspaceExecutionLockService';
import { TYPES } from 'backend-common/types';
import { coreContainer } from 'core/inversify.config';
import type { FolderPickerService } from 'core/platform/FolderPickerService';
import type { SecretStore } from 'core/platform/SecretStore';
import { CORETYPES } from 'core/types/types';
import { Container } from 'inversify';
import { IpcHandlerRegistry } from './ipc';
import { ElectronSecretStore } from './platform/ElectronSecretStore';
import { ElectronFolderPickerService } from './services/ElectronFolderPickerService';

const container = new Container({ parent: coreContainer });

coreContainer.rebind<SecretStore>(CORETYPES.SecretStore).to(ElectronSecretStore).inSingletonScope();
coreContainer
    .bind<FolderPickerService>(CORETYPES.FolderPickerService)
    .to(ElectronFolderPickerService)
    .inSingletonScope();

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
container.bind<TaskExecutionService>(TYPES.TaskExecutionService).to(TaskExecutionService).inSingletonScope();
container
    .bind<WorkspaceExecutionLockService>(TYPES.WorkspaceExecutionLockService)
    .to(WorkspaceExecutionLockService)
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
container.bind<Controller>(TYPES.Controller).to(TaskController).inSingletonScope();
container.bind<Controller>(TYPES.Controller).to(WorkspaceController).inSingletonScope();
container.bind<Controller>(TYPES.Controller).to(UserController).inSingletonScope();
container.bind<Controller>(TYPES.Controller).to(GuardrailsController).inSingletonScope();
container.bind<Controller>(TYPES.Controller).to(SkillController).inSingletonScope();

export default container;
