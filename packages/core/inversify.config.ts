import 'reflect-metadata';
import { Container } from 'inversify';
import { DatabaseManager } from './database/DatabaseManager';
import { Base64SecretStore, type SecretStore } from './platform/SecretStore';
import { AcpAgentRepository } from './repositories/AcpAgentRepository';
import { ChatRepository } from './repositories/ChatRepository';
import { CommandRepository } from './repositories/CommandRepository';
import { McpServerRepository } from './repositories/McpServerRepository';
import { MessageRepository } from './repositories/MessageRepository';
import { ModelProviderRepository } from './repositories/ModelProviderRepository';
import { PersonaRepository } from './repositories/PersonaRepository';
import { WebSearchConfigRepository } from './repositories/WebSearchConfigRepository';
import { WorkflowRepository } from './repositories/WorkflowRepository';
import { WorkflowRunRepository } from './repositories/WorkflowRunRepository';
import { AcpAgentService } from './services/AcpAgentService';
import { AcpRegistryService } from './services/AcpRegistryService';
import { ChatService } from './services/ChatService';
import { CommandService } from './services/CommandService';
import { McpClientManager } from './services/McpClientManager';
import { McpServerService } from './services/McpServerService';
import { MessageService } from './services/MessageService';
import { ModelProviderService } from './services/ModelProviderService';
import { PersonaService } from './services/PersonaService';
import { WebSearchConfigService } from './services/WebSearchConfigService';
import { WorkflowRunService } from './services/WorkflowRunService';
import { WorkflowService } from './services/WorkflowService';
import { CORETYPES } from './types/types';

const coreContainer = new Container();

// Database
coreContainer.bind<DatabaseManager>(CORETYPES.DatabaseManager).to(DatabaseManager).inSingletonScope();
coreContainer.bind<SecretStore>(CORETYPES.SecretStore).to(Base64SecretStore).inSingletonScope();

// Repositories
coreContainer.bind<ChatRepository>(CORETYPES.ChatRepository).to(ChatRepository).inSingletonScope();
coreContainer.bind<MessageRepository>(CORETYPES.MessageRepository).to(MessageRepository).inSingletonScope();
coreContainer
    .bind<ModelProviderRepository>(CORETYPES.ModelProviderRepository)
    .to(ModelProviderRepository)
    .inSingletonScope();
coreContainer.bind<PersonaRepository>(CORETYPES.PersonaRepository).to(PersonaRepository).inSingletonScope();
coreContainer.bind<CommandRepository>(CORETYPES.CommandRepository).to(CommandRepository).inSingletonScope();
coreContainer.bind<McpServerRepository>(CORETYPES.McpServerRepository).to(McpServerRepository).inSingletonScope();
coreContainer.bind<AcpAgentRepository>(CORETYPES.AcpAgentRepository).to(AcpAgentRepository).inSingletonScope();
coreContainer
    .bind<WebSearchConfigRepository>(CORETYPES.WebSearchConfigRepository)
    .to(WebSearchConfigRepository)
    .inSingletonScope();
coreContainer.bind<WorkflowRepository>(CORETYPES.WorkflowRepository).to(WorkflowRepository).inSingletonScope();
coreContainer.bind<WorkflowRunRepository>(CORETYPES.WorkflowRunRepository).to(WorkflowRunRepository).inSingletonScope();

// Services
coreContainer.bind<ChatService>(CORETYPES.ChatService).to(ChatService).inSingletonScope();
coreContainer.bind<MessageService>(CORETYPES.MessageService).to(MessageService).inSingletonScope();
coreContainer.bind<ModelProviderService>(CORETYPES.ModelProviderService).to(ModelProviderService).inSingletonScope();
coreContainer.bind<PersonaService>(CORETYPES.PersonaService).to(PersonaService).inSingletonScope();
coreContainer.bind<CommandService>(CORETYPES.CommandService).to(CommandService).inSingletonScope();
coreContainer.bind<McpServerService>(CORETYPES.McpServerService).to(McpServerService).inSingletonScope();
coreContainer.bind<McpClientManager>(CORETYPES.McpClientManager).to(McpClientManager).inSingletonScope();
coreContainer.bind<AcpAgentService>(CORETYPES.AcpAgentService).to(AcpAgentService).inSingletonScope();
coreContainer.bind<AcpRegistryService>(CORETYPES.AcpRegistryService).to(AcpRegistryService).inSingletonScope();
coreContainer
    .bind<WebSearchConfigService>(CORETYPES.WebSearchConfigService)
    .to(WebSearchConfigService)
    .inSingletonScope();
coreContainer.bind<WorkflowService>(CORETYPES.WorkflowService).to(WorkflowService).inSingletonScope();
coreContainer.bind<WorkflowRunService>(CORETYPES.WorkflowRunService).to(WorkflowRunService).inSingletonScope();

export { coreContainer };
