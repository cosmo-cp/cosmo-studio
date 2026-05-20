import {Container} from "inversify";
import {coreContainer} from "../../../packages/core/inversify.config";
import {CORETYPES} from "core/types/types";
import type {SecretStore} from "core/platform/SecretStore";
import {NodeSecretStore} from "core/platform/NodeSecretStore";
import {TYPES} from "../types";
import {Controller} from "../controllers/Controller";
import {ChatStreamingService} from "../services/ChatStreamingService";
import {WorkflowExecutionService} from '../services/WorkflowExecutionService';
import {WorkflowRunStreamingService} from '../services/WorkflowRunStreamingService';
import {rpcControllerConstructors} from "./rpc-manifest";

coreContainer.rebindSync<SecretStore>(CORETYPES.SecretStore).to(NodeSecretStore).inSingletonScope();

const httpContainer = new Container({parent: coreContainer});

httpContainer.bind<ChatStreamingService>(TYPES.ChatStreamingService).to(ChatStreamingService).inSingletonScope();
httpContainer.bind<WorkflowExecutionService>(TYPES.WorkflowExecutionService).to(WorkflowExecutionService).inSingletonScope();
httpContainer.bind<WorkflowRunStreamingService>(TYPES.WorkflowRunStreamingService).to(WorkflowRunStreamingService).inSingletonScope();

for (const controller of rpcControllerConstructors) {
    httpContainer.bind<Controller>(TYPES.Controller).to(controller).inSingletonScope();
}

export {httpContainer};
