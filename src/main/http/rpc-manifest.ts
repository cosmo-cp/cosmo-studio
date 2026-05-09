import {ChatController} from "../controllers/ChatController";
import {ModelProviderController} from "../controllers/ModelProviderController";
import {MessageController} from "../controllers/MessageController";
import {PersonaController} from "../controllers/PersonaController";
import {CommandController} from "../controllers/CommandController";
import {McpServerController} from "../controllers/McpServerController";
import {WebSearchController} from "../controllers/WebSearchController";

export const rpcControllerConstructors = [ChatController, ModelProviderController, MessageController, PersonaController, CommandController, McpServerController, WebSearchController] as const;
