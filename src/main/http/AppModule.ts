import path from 'path';
import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ChatHttpController } from './ChatHttpController';
import { HealthController } from './HealthController';
import { RpcController } from './RpcController';
import { WorkflowRunHttpController } from './WorkflowRunHttpController';

const rendererOutDir = path.resolve(__dirname, 'public');

@Module({
    imports: [
        ServeStaticModule.forRoot({
            rootPath: rendererOutDir,
            exclude: ['/api{/*path}'],
        }),
    ],
    controllers: [HealthController, RpcController, ChatHttpController, WorkflowRunHttpController],
})
export class AppModule {}
