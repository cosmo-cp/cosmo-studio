import { AcpAgentController } from '../controllers/AcpAgentController';
import { ChatController } from '../controllers/ChatController';
import { CommandController } from '../controllers/CommandController';
import { GuardrailsController } from '../controllers/GuardrailsController';
import { McpServerController } from '../controllers/McpServerController';
import { MessageController } from '../controllers/MessageController';
import { ModelProviderController } from '../controllers/ModelProviderController';
import { PersonaController } from '../controllers/PersonaController';
import { SkillController } from '../controllers/SkillController';
import { TaskController } from '../controllers/TaskController';
import { UserController } from '../controllers/UserController';
import { WebSearchController } from '../controllers/WebSearchController';
import { WorkflowController } from '../controllers/WorkflowController';
import { WorkspaceController } from '../controllers/WorkspaceController';

export const rpcControllerConstructors = [
    ChatController,
    ModelProviderController,
    MessageController,
    PersonaController,
    SkillController,
    CommandController,
    McpServerController,
    WebSearchController,
    WorkflowController,
    AcpAgentController,
    TaskController,
    WorkspaceController,
    UserController,
    GuardrailsController,
] as const;
