import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vitest/config';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const eeDir = fs.existsSync(path.resolve(dirname, './src/ee'))
    ? path.resolve(dirname, './src/ee')
    : path.resolve(dirname, './src/ee-stub');

export default defineConfig({
    resolve: {
        alias: {
            '@': path.resolve(dirname, './src'),
            '@ee': eeDir,
            contracts: path.resolve(dirname, '../../packages/contracts'),
            core: path.resolve(dirname, '../../packages/core'),
        },
    },
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./src/test/setup.ts'],
        include: ['src/**/*.test.tsx'],
    },
});
