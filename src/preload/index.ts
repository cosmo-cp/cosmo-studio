import { contextBridge } from 'electron';
import { rpcApi } from './api';
import log from 'electron-log/renderer';

const logger = log.scope('preload');

contextBridge.exposeInMainWorld('api', rpcApi);

logger.info('Preload script loaded and API exposed!');
