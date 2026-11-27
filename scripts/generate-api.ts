import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { AcpAgentController } from '../packages/backend-common/controllers/AcpAgentController';
import { ChatController } from '../packages/backend-common/controllers/ChatController';
import { CommandController } from '../packages/backend-common/controllers/CommandController';
import { GuardrailsController } from '../packages/backend-common/controllers/GuardrailsController';
import { McpServerController } from '../packages/backend-common/controllers/McpServerController';
import { MessageController } from '../packages/backend-common/controllers/MessageController';
import { ModelProviderController } from '../packages/backend-common/controllers/ModelProviderController';
import { PersonaController } from '../packages/backend-common/controllers/PersonaController';
import { SkillController } from '../packages/backend-common/controllers/SkillController';
import { StreamingChatController } from '../packages/backend-common/controllers/StreamingChatController';
import { TaskController } from '../packages/backend-common/controllers/TaskController';
import { UserController } from '../packages/backend-common/controllers/UserController';
import { WebSearchController } from '../packages/backend-common/controllers/WebSearchController';
import { WorkflowController } from '../packages/backend-common/controllers/WorkflowController';
import { WorkspaceController } from '../packages/backend-common/controllers/WorkspaceController';
import { generateHttpRpcManifestContent, generatePreloadApiFiles, type ControllerSource } from './generate-api-lib';

const httpManifestFilePath = path.resolve(__dirname, '../apps/cosmo-http/src/rpc-manifest.ts');

const controllers = [
    ChatController,
    ModelProviderController,
    StreamingChatController,
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
];

const controllerPaths = {
    ChatController: path.resolve(__dirname, '../packages/backend-common/controllers/ChatController.ts'),
    ModelProviderController: path.resolve(
        __dirname,
        '../packages/backend-common/controllers/ModelProviderController.ts',
    ),
    StreamingChatController: path.resolve(
        __dirname,
        '../packages/backend-common/controllers/StreamingChatController.ts',
    ),
    MessageController: path.resolve(__dirname, '../packages/backend-common/controllers/MessageController.ts'),
    PersonaController: path.resolve(__dirname, '../packages/backend-common/controllers/PersonaController.ts'),
    SkillController: path.resolve(__dirname, '../packages/backend-common/controllers/SkillController.ts'),
    McpServerController: path.resolve(__dirname, '../packages/backend-common/controllers/McpServerController.ts'),
    CommandController: path.resolve(__dirname, '../packages/backend-common/controllers/CommandController.ts'),
    WebSearchController: path.resolve(__dirname, '../packages/backend-common/controllers/WebSearchController.ts'),
    WorkflowController: path.resolve(__dirname, '../packages/backend-common/controllers/WorkflowController.ts'),
    AcpAgentController: path.resolve(__dirname, '../packages/backend-common/controllers/AcpAgentController.ts'),
    TaskController: path.resolve(__dirname, '../packages/backend-common/controllers/TaskController.ts'),
    WorkspaceController: path.resolve(__dirname, '../packages/backend-common/controllers/WorkspaceController.ts'),
    UserController: path.resolve(__dirname, '../packages/backend-common/controllers/UserController.ts'),
    GuardrailsController: path.resolve(__dirname, '../packages/backend-common/controllers/GuardrailsController.ts'),
};

const controllerFileContents: { [key: string]: string } = {};
for (const controllerName in controllerPaths) {
    controllerFileContents[controllerName] = fs.readFileSync(
        controllerPaths[controllerName as keyof typeof controllerPaths],
        'utf-8',
    );
}

const controllerSources: ControllerSource[] = controllers.map((controller) => {
    return {
        controller: controller,
        source: controllerFileContents[controller.name],
    };
});

const preloadFiles = generatePreloadApiFiles(controllerSources);
const httpManifestContent = generateHttpRpcManifestContent(controllerSources);

for (const [filePath, content] of Object.entries(preloadFiles)) {
    fs.mkdirSync(path.dirname(path.resolve(__dirname, `../${filePath}`)), { recursive: true });
    fs.writeFileSync(path.resolve(__dirname, `../${filePath}`), content, { encoding: 'utf-8' });
}
fs.mkdirSync(path.dirname(httpManifestFilePath), { recursive: true });
fs.writeFileSync(httpManifestFilePath, httpManifestContent, { encoding: 'utf-8' });

console.log('Successfully generated preload and RPC API files');
