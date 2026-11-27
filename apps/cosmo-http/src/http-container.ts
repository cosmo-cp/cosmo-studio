import { Controller } from 'backend-common/controllers/Controller';
import { AcpAgentRuntimeService } from 'backend-common/services/AcpAgentRuntimeService';
import { ChatStreamingService } from 'backend-common/services/ChatStreamingService';
import { TaskExecutionService } from 'backend-common/services/TaskExecutionService';
import { WorkflowExecutionService } from 'backend-common/services/WorkflowExecutionService';
import { WorkflowRunStreamingService } from 'backend-common/services/WorkflowRunStreamingService';
import { WorkspaceExecutionLockService } from 'backend-common/services/WorkspaceExecutionLockService';
import { TYPES } from 'backend-common/types';
import { coreContainer } from 'core/inversify.config';
import type { FolderPickerService } from 'core/platform/FolderPickerService';
import { NodeSecretStore } from 'core/platform/NodeSecretStore';
import type { SecretStore } from 'core/platform/SecretStore';
import { CORETYPES } from 'core/types/types';
import { Container } from 'inversify';
import { rpcControllerConstructors } from './rpc-manifest';
import { HttpFolderPickerService } from './services/HttpFolderPickerService';

coreContainer.rebind<SecretStore>(CORETYPES.SecretStore).to(NodeSecretStore).inSingletonScope();
coreContainer.bind<FolderPickerService>(CORETYPES.FolderPickerService).to(HttpFolderPickerService).inSingletonScope();

const httpContainer = new Container({ parent: coreContainer });

httpContainer.bind<ChatStreamingService>(TYPES.ChatStreamingService).to(ChatStreamingService).inSingletonScope();
httpContainer.bind<AcpAgentRuntimeService>(TYPES.AcpAgentRuntimeService).to(AcpAgentRuntimeService).inSingletonScope();
httpContainer
    .bind<WorkflowExecutionService>(TYPES.WorkflowExecutionService)
    .to(WorkflowExecutionService)
    .inSingletonScope();
httpContainer
    .bind<WorkflowRunStreamingService>(TYPES.WorkflowRunStreamingService)
    .to(WorkflowRunStreamingService)
    .inSingletonScope();
httpContainer.bind<TaskExecutionService>(TYPES.TaskExecutionService).to(TaskExecutionService).inSingletonScope();
httpContainer
    .bind<WorkspaceExecutionLockService>(TYPES.WorkspaceExecutionLockService)
    .to(WorkspaceExecutionLockService)
    .inSingletonScope();

for (const controller of rpcControllerConstructors) {
    httpContainer.bind<Controller>(TYPES.Controller).to(controller).inSingletonScope();
}

export { httpContainer };
