import { Container } from 'inversify';
import { IpcHandlerRegistry } from './ipc';
import { coreContainer } from '../../packages/core/inversify.config';
import { TYPES } from './types';
import { ChatController } from './controllers/ChatController';
import { ModelProviderController } from './controllers/ModelProviderController';
import { Controller } from './controllers/Controller';
import { StreamingChatController } from './controllers/StreamingChatController';
import { MessageController } from './controllers/MessageController';
import { PersonaController } from './controllers/PersonaController';
import { CommandController } from './controllers/CommandController';
import { McpServerController } from './controllers/McpServerController';
import {WebSearchController} from "./controllers/WebSearchController";
import { WorkflowController } from './controllers/WorkflowController';
import {CORETYPES} from "core/types/types";
import type {SecretStore} from "core/platform/SecretStore";
import {ElectronSecretStore} from "./platform/ElectronSecretStore";
import {ChatStreamingService} from "./services/ChatStreamingService";

const container = new Container({ parent: coreContainer });

coreContainer.rebindSync<SecretStore>(CORETYPES.SecretStore).to(ElectronSecretStore).inSingletonScope();

container.bind<IpcHandlerRegistry>(TYPES.IpcHandlerRegistry).to(IpcHandlerRegistry).inSingletonScope();
container.bind<ChatStreamingService>(TYPES.ChatStreamingService).to(ChatStreamingService).inSingletonScope();

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

export default container;
