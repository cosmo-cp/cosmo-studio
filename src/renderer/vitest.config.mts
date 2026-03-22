import path from 'path';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vitest/config';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(dirname, './src'),
        },
    },
    test: {
        passWithNoTests: true,
        clearMocks: true,
        environment: 'jsdom',
        setupFiles: ['./src/test/setup-tests.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'lcov'],
        },
    },
});
