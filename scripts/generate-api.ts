import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { AcpAgentController } from '../src/main/controllers/AcpAgentController';
import { ChatController } from '../src/main/controllers/ChatController';
import { CommandController } from '../src/main/controllers/CommandController';
import { McpServerController } from '../src/main/controllers/McpServerController';
import { MessageController } from '../src/main/controllers/MessageController';
import { ModelProviderController } from '../src/main/controllers/ModelProviderController';
import { PersonaController } from '../src/main/controllers/PersonaController';
import { StreamingChatController } from '../src/main/controllers/StreamingChatController';
import { WebSearchController } from '../src/main/controllers/WebSearchController';
import { WorkflowController } from '../src/main/controllers/WorkflowController';
import { generateHttpRpcManifestContent, generatePreloadApiFiles, type ControllerSource } from './generate-api-lib';

const httpManifestFilePath = path.resolve(__dirname, '../src/main/http/rpc-manifest.ts');

const controllers = [
    ChatController,
    ModelProviderController,
    StreamingChatController,
    MessageController,
    PersonaController,
    CommandController,
    McpServerController,
    WebSearchController,
    WorkflowController,
    AcpAgentController,
];

const controllerPaths = {
    ChatController: path.resolve(__dirname, '../src/main/controllers/ChatController.ts'),
    ModelProviderController: path.resolve(__dirname, '../src/main/controllers/ModelProviderController.ts'),
    StreamingChatController: path.resolve(__dirname, '../src/main/controllers/StreamingChatController.ts'),
    MessageController: path.resolve(__dirname, '../src/main/controllers/MessageController.ts'),
    PersonaController: path.resolve(__dirname, '../src/main/controllers/PersonaController.ts'),
    McpServerController: path.resolve(__dirname, '../src/main/controllers/McpServerController.ts'),
    CommandController: path.resolve(__dirname, '../src/main/controllers/CommandController.ts'),
    WebSearchController: path.resolve(__dirname, '../src/main/controllers/WebSearchController.ts'),
    WorkflowController: path.resolve(__dirname, '../src/main/controllers/WorkflowController.ts'),
    AcpAgentController: path.resolve(__dirname, '../src/main/controllers/AcpAgentController.ts'),
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
