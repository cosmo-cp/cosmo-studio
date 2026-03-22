import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import {ChatController} from '../src/main/controllers/ChatController';
import {ModelProviderController} from '../src/main/controllers/ModelProviderController';
import {StreamingChatController} from '../src/main/controllers/StreamingChatController';
import {MessageController} from "../src/main/controllers/MessageController";
import {PersonaController} from "../src/main/controllers/PersonaController";
import {CommandController} from "../src/main/controllers/CommandController";
import {McpServerController} from "../src/main/controllers/McpServerController";
import {WebSearchController} from "../src/main/controllers/WebSearchController";
import {generateApiContent, type ControllerSource} from "./generate-api-lib";

const apiFilePath = path.resolve(__dirname, '../src/preload/api.ts');

const controllers = [
    ChatController,
    ModelProviderController,
    StreamingChatController,
    MessageController,
    PersonaController,
    CommandController,
    McpServerController,
    WebSearchController
];

const controllerPaths = {
    'ChatController': path.resolve(__dirname, '../src/main/controllers/ChatController.ts'),
    'ModelProviderController': path.resolve(__dirname, '../src/main/controllers/ModelProviderController.ts'),
    'StreamingChatController': path.resolve(__dirname, '../src/main/controllers/StreamingChatController.ts'),
    'MessageController': path.resolve(__dirname, '../src/main/controllers/MessageController.ts'),
    'PersonaController': path.resolve(__dirname, '../src/main/controllers/PersonaController.ts'),
    'McpServerController': path.resolve(__dirname, '../src/main/controllers/McpServerController.ts'),
    'CommandController': path.resolve(__dirname, '../src/main/controllers/CommandController.ts'),
    'WebSearchController': path.resolve(__dirname, '../src/main/controllers/WebSearchController.ts'),
};

const controllerFileContents: { [key: string]: string } = {};
for (const controllerName in controllerPaths) {
    controllerFileContents[controllerName] = fs.readFileSync(controllerPaths[controllerName as keyof typeof controllerPaths], 'utf-8');
}

const controllerSources: ControllerSource[] = controllers.map((controller) => ({
    controller,
    source: controllerFileContents[controller.name],
}));

const apiContent = generateApiContent(controllerSources);

fs.writeFileSync(apiFilePath, apiContent, {encoding: 'utf-8'});

console.log('Successfully generated api.ts');
