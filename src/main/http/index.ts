import 'reflect-metadata';
import fs from 'fs';
import path from 'path';
import { NestFactory } from '@nestjs/core';
import { DatabaseManager } from 'core/database/DatabaseManager';
import { getCoreLogger } from 'core/platform/CoreLogger';
import { McpClientManager } from 'core/services/McpClientManager';
import { CORETYPES } from 'core/types/types';
import { config } from 'dotenv';
import { AppModule } from './AppModule';
import { httpContainer } from './http-container';

config();

async function initializeDatabase(): Promise<void> {
    const dataDir = process.env.COSMO_HTTP_DATA_DIR ?? path.join(process.cwd(), '.cosmo-http');
    process.env.COSMO_HTTP_DATA_DIR = dataDir;
    fs.mkdirSync(dataDir, { recursive: true });
    await DatabaseManager.initialize(path.join(dataDir, 'database'));
}

async function initializeMcpClients(): Promise<void> {
    try {
        const mcpClientManager = httpContainer.get<McpClientManager>(CORETYPES.McpClientManager);
        await mcpClientManager.initializeClients();
        getCoreLogger().info(`Initialized ${mcpClientManager.getClientCount()} MCP client(s)`);
    } catch (error) {
        getCoreLogger().error('Failed to initialize MCP clients:', error);
    }
}

async function bootstrap(): Promise<void> {
    await initializeDatabase();
    await initializeMcpClients();

    const app = await NestFactory.create(AppModule);
    const host = process.env.COSMO_HTTP_HOST ?? '127.0.0.1';
    const port = Number(process.env.COSMO_HTTP_PORT ?? '4000');

    if (process.env.NODE_ENV === 'development') {
        app.enableCors({
            origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
            credentials: false,
        });
    }

    await app.listen(port, host);
    getCoreLogger().info(`Cosmo HTTP service listening at http://${host}:${port}`);
}

void bootstrap();
