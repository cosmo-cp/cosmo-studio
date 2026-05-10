import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { ChatController } from '../src/main/controllers/ChatController';
import { ModelProviderController } from '../src/main/controllers/ModelProviderController';
import { StreamingChatController } from '../src/main/controllers/StreamingChatController';
import { MessageController } from '../src/main/controllers/MessageController';
import { PersonaController } from '../src/main/controllers/PersonaController';
import { CommandController } from '../src/main/controllers/CommandController';
import { McpServerController } from '../src/main/controllers/McpServerController';
import { WebSearchController} from "../src/main/controllers/WebSearchController";
import { WorkflowController } from '../src/main/controllers/WorkflowController';
import {
    generateApiContent,
    generateHttpClientContent,
    generateHttpRpcManifestContent,
    type ControllerSource
} from './generate-api-lib';

const apiFilePath = path.resolve(__dirname, '../src/preload/api.ts');
const httpManifestFilePath = path.resolve(__dirname, '../src/main/http/rpc-manifest.ts');
const httpClientFilePath = path.resolve(__dirname, '../src/renderer/src/lib/generated-http-api.ts');

const controllers = [
    ChatController,
    ModelProviderController,
    StreamingChatController,
    MessageController,
    PersonaController,
    CommandController,
    McpServerController,
    WebSearchController,
    WorkflowController
];

const controllerPaths = {
    ChatController: path.resolve(__dirname, '../src/main/controllers/ChatController.ts'),
    ModelProviderController: path.resolve(__dirname, '../src/main/controllers/ModelProviderController.ts'),
    StreamingChatController: path.resolve(__dirname, '../src/main/controllers/StreamingChatController.ts'),
    MessageController: path.resolve(__dirname, '../src/main/controllers/MessageController.ts'),
    PersonaController: path.resolve(__dirname, '../src/main/controllers/PersonaController.ts'),
    McpServerController: path.resolve(__dirname, '../src/main/controllers/McpServerController.ts'),
    CommandController: path.resolve(__dirname, '../src/main/controllers/CommandController.ts'),
    'WebSearchController': path.resolve(__dirname, '../src/main/controllers/WebSearchController.ts'),
    WorkflowController: path.resolve(__dirname, '../src/main/controllers/WorkflowController.ts'),
};

const controllerFileContents: { [key: string]: string } = {};
for (const controllerName in controllerPaths) {
    controllerFileContents[controllerName] = fs.readFileSync(
        controllerPaths[controllerName as keyof typeof controllerPaths],
        'utf-8',
    );
}

const controllerSources: ControllerSource[] = controllers.map((controller) => ({
    controller,
    source: controllerFileContents[controller.name],
}));

const apiContent = generateApiContent(controllerSources);
const httpManifestContent = generateHttpRpcManifestContent(controllerSources);
const httpClientContent = generateHttpClientContent(controllerSources);

fs.writeFileSync(apiFilePath, apiContent, { encoding: 'utf-8' });
fs.mkdirSync(path.dirname(httpManifestFilePath), {recursive: true});
fs.mkdirSync(path.dirname(httpClientFilePath), {recursive: true});
fs.writeFileSync(httpManifestFilePath, httpManifestContent, {encoding: 'utf-8'});
fs.writeFileSync(httpClientFilePath, httpClientContent, {encoding: 'utf-8'});

console.log('Successfully generated api.ts');
