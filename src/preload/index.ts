import { contextBridge } from 'electron';
import log from 'electron-log/renderer';
import { rpcApi } from './rpc-api';

const logger = log.scope('preload');

contextBridge.exposeInMainWorld('api', rpcApi);

logger.info('Preload script loaded and API exposed!');
