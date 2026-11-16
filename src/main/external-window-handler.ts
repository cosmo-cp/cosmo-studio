import { shell, type WebContents } from 'electron';
import { logger } from './logger';

// Keep external pages out of Electron windows and use the user's default browser.
export function registerExternalWindowHandler(webContents: WebContents): void {
    webContents.setWindowOpenHandler(({ url }) => {
        try {
            const parsed = new URL(url);
            if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
                void shell.openExternal(parsed.href).catch(() => {
                    logger.warn('Unable to open external link in the default browser.');
                });
            }
        } catch {
            logger.warn('Blocked an invalid external link.');
        }
        return { action: 'deny' };
    });
}
