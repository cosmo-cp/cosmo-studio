import { AcpAgentController } from 'backend-common/controllers/AcpAgentController';
import { ChatController } from 'backend-common/controllers/ChatController';
import { CommandController } from 'backend-common/controllers/CommandController';
import { GuardrailsController } from 'backend-common/controllers/GuardrailsController';
import { McpServerController } from 'backend-common/controllers/McpServerController';
import { MessageController } from 'backend-common/controllers/MessageController';
import { ModelProviderController } from 'backend-common/controllers/ModelProviderController';
import { PersonaController } from 'backend-common/controllers/PersonaController';
import { SkillController } from 'backend-common/controllers/SkillController';
import { TaskController } from 'backend-common/controllers/TaskController';
import { UserController } from 'backend-common/controllers/UserController';
import { WebSearchController } from 'backend-common/controllers/WebSearchController';
import { WorkflowController } from 'backend-common/controllers/WorkflowController';
import { WorkspaceController } from 'backend-common/controllers/WorkspaceController';

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
