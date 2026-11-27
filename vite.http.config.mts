import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const dirname = path.dirname(fileURLToPath(import.meta.url));

const copyRuntimeAssetsPlugin = () => {
    return {
        name: 'copy-http-runtime-assets',
        closeBundle: function () {
            const outDir = path.resolve(dirname, '.vite/http');
            const migrationsSource = path.resolve(dirname, 'migrations/core');
            const migrationsTarget = path.resolve(outDir, 'migrations/core');
            const rendererSource = path.resolve(dirname, 'apps/cosmo-web/out');
            const rendererTarget = path.resolve(outDir, 'public');

            fs.mkdirSync(migrationsTarget, { recursive: true });
            fs.cpSync(migrationsSource, migrationsTarget, { recursive: true });

            if (fs.existsSync(rendererSource)) {
                fs.mkdirSync(rendererTarget, { recursive: true });
                fs.cpSync(rendererSource, rendererTarget, { recursive: true });
            }
        },
    };
};

const httpEeDir = fs.existsSync(path.resolve(dirname, './apps/cosmo-http/src/ee'))
    ? path.resolve(dirname, './apps/cosmo-http/src/ee')
    : path.resolve(dirname, './apps/cosmo-http/src/ee-stub');

export default defineConfig({
    resolve: {
        tsconfigPaths: true,
        alias: {
            '@ee': httpEeDir,
        },
    },
    ssr: {
        noExternal: ['core', 'guardrails', 'contracts', 'backend-common'],
    },
    build: {
        ssr: './apps/cosmo-http/src/index.ts',
        target: 'node20',
        rollupOptions: {
            external: ['@electric-sql/pglite'],
            output: {
                entryFileNames: 'main.js',
                format: 'cjs',
            },
        },
        outDir: path.resolve(dirname, '.vite/http'),
        sourcemap: true,
        emptyOutDir: true,
    },
    plugins: [copyRuntimeAssetsPlugin()],
});
