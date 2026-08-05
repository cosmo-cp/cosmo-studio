import fs from 'fs';
import path from 'path';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { VitePlugin } from '@electron-forge/plugin-vite';
import type { ForgeConfig } from '@electron-forge/shared-types';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import NextPlugin from './src/NextPlugin';

const isMacSigning = process.env.ENABLE_MAC_SIGNING === 'true';

const config: ForgeConfig = {
    packagerConfig: {
        name: 'Cosmo Studio',
        executableName: 'CosmoStudio', //Needed for linux
        asar: true,
        icon: './icons/cosmo',
        appBundleId: 'com.cosmocp.cosmostudio',
        ...(isMacSigning
            ? {
                  osxSign: {
                      keychain: process.env.KEYCHAIN_PATH || 'signing.keychain-db',
                      identity: process.env.SIGN_IDENTITY,
                      optionsForFile: () => {
                          return {
                              entitlements: './entitlements.plist',
                              hardenedRuntime: true,
                          };
                      },
                  },
                  osxNotarize: {
                      appleId: process.env.APPLE_ID,
                      appleIdPassword: process.env.APPLE_ID_PASSWORD,
                      teamId: process.env.APPLE_TEAM_ID,
                  },
              }
            : {}),
    },
    rebuildConfig: {},
    makers: [
        new MakerSquirrel({}),
        new MakerZIP({}, ['darwin']),
        new MakerRpm({}),
        new MakerDeb({
            options: {
                icon: './icons/cosmo.png',
            },
        }),
    ],

    plugins: [
        new VitePlugin({
            // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
            // If you are familiar with Vite configuration, it will look really familiar.
            build: [
                {
                    // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
                    entry: 'src/main/index.ts',
                    config: 'vite.main.config.ts',
                    target: 'main',
                },
                {
                    entry: 'src/preload/index.ts',
                    config: 'vite.preload.config.ts',
                    target: 'preload',
                },
            ],
            renderer: [], // Empty renderer part because we build next.js
        }),
        //this plugin copies files already build next.js frontend app
        //next.js frontend app is build part of `make/packages` script
        new NextPlugin({
            outDir: '../.vite/renderer/main_window',
            sourceDir: './renderer/out',
        }),
        // Fuses are used to enable/disable various Electron functionality
        // at packages time, before code signing the application
        new FusesPlugin({
            version: FuseVersion.V1,
            [FuseV1Options.RunAsNode]: false,
            [FuseV1Options.EnableCookieEncryption]: true,
            [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
            [FuseV1Options.EnableNodeCliInspectArguments]: false,
            [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
            [FuseV1Options.OnlyLoadAppFromAsar]: true,
        }),
    ],
    publishers: [
        {
            name: '@electron-forge/publisher-github',
            config: {
                authToken: process.env.GITHUB_TOKEN,
                repository: {
                    owner: 'Cosmo-cp',
                    name: 'cosmo-studio',
                },
                draft: true,
                force: true,
                generateReleaseNotes: true,
                prerelease: false,
            },
        },
    ],
    // we asked vite not to bundle PGLite because it was not bundled properly
    // now we copy PGlite packages directly into electron asar bundle
    hooks: {
        packageAfterCopy: async function (_forgeConfig, buildPath) {
            const requiredNativePackages = ['@electric-sql'];

            // __dirname isn't accessible from here
            const dirnamePath: string = '.';
            const sourceNodeModulesPath = path.resolve(dirnamePath, 'node_modules');
            const destNodeModulesPath = path.resolve(buildPath, 'node_modules');

            // Copy all asked packages in /node_modules directory inside the asar archive
            await Promise.all(
                requiredNativePackages.map(async (packageName) => {
                    const sourcePath = path.join(sourceNodeModulesPath, packageName);
                    const destPath = path.join(destNodeModulesPath, packageName);

                    fs.mkdirSync(destPath, { recursive: true });
                    fs.cpSync(sourcePath, destPath, { recursive: true });
                }),
            );
        },
        postPackage: async (forgeConfig, options) => {
            console.info('Packages built at:', options.outputPaths);
        },
    },
};
export default config;
