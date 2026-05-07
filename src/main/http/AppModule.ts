import path from "path";
import {Module} from "@nestjs/common";
import {ServeStaticModule} from "@nestjs/serve-static";
import {RpcController} from "./RpcController";
import {ChatHttpController} from "./ChatHttpController";
import {HealthController} from "./HealthController";

const rendererOutDir = path.resolve(__dirname, "public");

@Module({
    imports: [
        ServeStaticModule.forRoot({
            rootPath: rendererOutDir,
            exclude: ["/api/(.*)"],
        }),
    ],
    controllers: [
        HealthController,
        RpcController,
        ChatHttpController,
    ],
})
export class AppModule {
}
