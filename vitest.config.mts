import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vitest/config';

const dirname = path.dirname(fileURLToPath(import.meta.url));
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
    test: {
        passWithNoTests: true,
        clearMocks: true,
        environment: 'node',
        coverage: {
            provider: 'v8',
            reporter: ['text', 'lcov'],
            exclude: [
                '**/*.d.ts',
                '**/node_modules/**',
                '**/coverage/**',
                'coverage/**',
                '**/out/**',
                'out/**',
                'apps/cosmo-web/**',
                '**/.next/**',
                '**/.vite/**',
            ],
        },
        include: [
            'packages/**/*.test.ts',
            'scripts/**/*.test.ts',
            'apps/cosmo-desktop/**/*.test.ts',
            'apps/cosmo-http/**/*.test.ts',
        ],
    },
});
