import { contextBridge } from 'electron';
import { api } from './api';
import log from 'electron-log/renderer';

const logger = log.scope('preload');

contextBridge.exposeInMainWorld('api', api);

logger.info('Preload script loaded and API exposed!');
