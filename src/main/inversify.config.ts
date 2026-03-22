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

const container = new Container({ parent: coreContainer });

container.bind<IpcHandlerRegistry>(TYPES.IpcHandlerRegistry).to(IpcHandlerRegistry).inSingletonScope();

// Bind controllers
container.bind<Controller>(TYPES.Controller).to(ChatController).inSingletonScope();
container.bind<Controller>(TYPES.Controller).to(ModelProviderController).inSingletonScope();
container.bind<Controller>(TYPES.Controller).to(StreamingChatController).inSingletonScope();
container.bind<Controller>(TYPES.Controller).to(MessageController).inSingletonScope();
container.bind<Controller>(TYPES.Controller).to(PersonaController).inSingletonScope();
container.bind<Controller>(TYPES.Controller).to(CommandController).inSingletonScope();
container.bind<Controller>(TYPES.Controller).to(McpServerController).inSingletonScope();

export default container;
