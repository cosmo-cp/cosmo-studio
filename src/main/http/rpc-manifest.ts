import { AcpAgentController } from '../controllers/AcpAgentController';
import { ChatController } from '../controllers/ChatController';
import { CommandController } from '../controllers/CommandController';
import { McpServerController } from '../controllers/McpServerController';
import { MessageController } from '../controllers/MessageController';
import { ModelProviderController } from '../controllers/ModelProviderController';
import { PersonaController } from '../controllers/PersonaController';
import { TaskController } from '../controllers/TaskController';
import { WebSearchController } from '../controllers/WebSearchController';
import { WorkflowController } from '../controllers/WorkflowController';
import { WorkspaceController } from '../controllers/WorkspaceController';

export const rpcControllerConstructors = [
    ChatController,
    ModelProviderController,
    MessageController,
    PersonaController,
    CommandController,
    McpServerController,
    WebSearchController,
    WorkflowController,
    AcpAgentController,
    TaskController,
    WorkspaceController,
] as const;
