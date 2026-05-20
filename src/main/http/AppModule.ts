import path from "path";
import {Module} from "@nestjs/common";
import {ServeStaticModule} from "@nestjs/serve-static";
import {RpcController} from "./RpcController";
import {ChatHttpController} from "./ChatHttpController";
import {HealthController} from "./HealthController";
import {WorkflowRunHttpController} from './WorkflowRunHttpController';

const rendererOutDir = path.resolve(__dirname, "public");

@Module({
    imports: [
        ServeStaticModule.forRoot({
            rootPath: rendererOutDir,
            exclude: ["/api{/*path}"],
        }),
    ],
    controllers: [
        HealthController,
        RpcController,
        ChatHttpController,
        WorkflowRunHttpController,
    ],
})
export class AppModule {
}
