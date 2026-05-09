import { app, BrowserWindow, safeStorage } from 'electron';
import path from 'path';
import { IpcHandlerRegistry } from './ipc';
import { DatabaseManager } from 'core/database/DatabaseManager';
import 'reflect-metadata';
import container from './inversify.config';
import { TYPES } from './types';
import { config } from 'dotenv';
import { updateElectronApp, UpdateSourceType } from 'update-electron-app';
import { logger } from './logger';
import { McpClientManager } from 'core/services/McpClientManager';
import { CORETYPES } from 'core/types/types';import {setCoreLogger} from "core/platform/CoreLogger";

setCoreLogger(logger);

export class Main {
    private mainWindow: BrowserWindow | null = null;
    private readonly isDev = !app.isPackaged;
    private readonly MAIN_WINDOW_VITE_DEV_SERVER_URL = this.isDev ? 'http://localhost:3000/splash' : undefined;

    constructor() {
        config();
        app.whenReady().then(async () => {
            if (!safeStorage.isEncryptionAvailable()) {
                logger.warn("safeStorage encryption unavailable. API keys won't be encrypted.");
            }
            await this.initializeDatabase();
            await this.initializeMcpClients();
            const ipcHandlerRegistry = container.get<IpcHandlerRegistry>(TYPES.IpcHandlerRegistry);
            ipcHandlerRegistry.registerIpcHandlers();
            await this.createWindow();
            this.registerAppEvents();
            // updateElectronApp should be called after 10 seconds in windows
            // read this doc: https://www.electronjs.org/docs/latest/api/auto-updater#windows
            setTimeout(() => {
                updateElectronApp({
                    updateSource: {
                        type: UpdateSourceType.ElectronPublicUpdateService,
                        repo: 'cosmo-cp/cosmo-studio',
                    },
                    updateInterval: '1 hour',
                });
            }, 60000);
        });
    }

    private async initializeDatabase(): Promise<void> {
        const dbFolderName = this.isDev ? process.env.DATABASE_NAME : 'database';
        if (!dbFolderName) {
            logger.error('FATAL ERROR: DATABASE_NAME environment variable is not set. Cannot initialize database.');
            app.quit();
            return;
        }

        try {
            const userDataPath = app.getPath('userData');
            const absoluteDbPath = path.join(userDataPath, dbFolderName);
            logger.info('Database Dir:' + absoluteDbPath);
            await DatabaseManager.initialize(absoluteDbPath);
        } catch (error) {
            logger.error('FATAL ERROR: Failed to initialize database connection.', error);
            app.quit(); // Stop execution if we cannot connect
        }
    }

    private async initializeMcpClients(): Promise<void> {
        try {
            const mcpClientManager = container.get<McpClientManager>(CORETYPES.McpClientManager);
            await mcpClientManager.initializeClients();
            const clientCount = mcpClientManager.getClientCount();
            logger.info(`Initialized ${clientCount} MCP client(s)`);
        } catch (error) {
            logger.error('Failed to initialize MCP clients:', error);
            // Don't quit the app, just log the error - MCP clients are optional
        }
    }

    private async createWindow(): Promise<void> {
        this.mainWindow = new BrowserWindow({
            height: 600,
            width: 800,
            icon: path.join(__dirname, '../../icons/favicon.ico'),
            webPreferences: {
                contextIsolation: true,
                nodeIntegration: false,
                preload: path.join(__dirname, '../preload/index.js'),
            },
        });
        this.mainWindow.webContents.reloadIgnoringCache();

        this.mainWindow.setMenuBarVisibility(false);

        if (this.MAIN_WINDOW_VITE_DEV_SERVER_URL) {
            await this.mainWindow.loadURL(this.MAIN_WINDOW_VITE_DEV_SERVER_URL);
        } else {
            await this.mainWindow.loadFile(path.join(__dirname, `../renderer/main_window/splash.html`));
        }
        if (this.isDev) {
            this.mainWindow.webContents.openDevTools();
            this.mainWindow.maximize();
        }
    }

    private registerAppEvents(): void {
        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                this.createWindow();
            }
        });

        app.on('window-all-closed', () => {
            if (process.platform !== 'darwin') {
                app.quit();
            }
        });
    }
}

new Main();
