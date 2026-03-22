import { namedHookWithTaskFn, PluginBase } from '@electron-forge/plugin-base';
import type { ForgeMultiHookMap } from '@electron-forge/shared-types';
import path from 'path';
import fs from 'fs';

/**
 * This plugin copies the Next.js build output from a specified source directory
 * to a specified output directory before packaging the Electron application.
 */
export default class NextPlugin extends PluginBase<NextPluginConfig> {
    name: 'NextPlugin';

    sourceDir: string;
    outDir: string;

    constructor(config: NextPluginConfig) {
        super(config);
        this.sourceDir = config.sourceDir;
        this.outDir = config.outDir;
    }
    getHooks = (): ForgeMultiHookMap => {
        return {
            prePackage: [
                namedHookWithTaskFn<'prePackage'>(async () => {
                    const dest = path.resolve(__dirname, this.outDir);
                    const src = path.resolve(__dirname, this.sourceDir);
                    if (!fs.existsSync(dest)) {
                        fs.mkdirSync(dest, { recursive: true });
                    }
                    fs.cpSync(src, dest, { recursive: true });
                }, 'Copy Next Bundle'),
            ],
        };
    };
}

export interface NextPluginConfig {
    /**
     * The directory where the Next.js application's build is located.
     */
    sourceDir: string; // e.g., './renderer/out'
    /**
     * The output directory for the Next.js build.
     */
    outDir: string; // e.g., '../.vite/renderer/main_window'
}
