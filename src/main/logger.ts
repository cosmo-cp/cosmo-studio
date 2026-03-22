import log from 'electron-log/main';
import path from 'path';
import { app } from 'electron';

log.initialize();

// Keep logging available in non-Electron contexts (tests, codegen).
const resolveLogDir = () => {
    if (!app || typeof app.getPath !== 'function') {
        return path.join(process.cwd(), 'logs');
    }

    try {
        return path.join(app.getPath('userData'), 'logs');
    } catch {
        return path.join(process.cwd(), 'logs');
    }
};

const logDir = resolveLogDir();

log.transports.file.level = 'info';
log.transports.file.maxSize = 5 * 1024 * 1024; // 5MB
log.transports.file.resolvePathFn = () => path.join(logDir, 'cosmo.log');

export const logger = log.scope('main');
