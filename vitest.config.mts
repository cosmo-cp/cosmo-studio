import { defineConfig } from 'vitest/config';

export default defineConfig({
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
                'src/renderer/**',
                '**/.next/**',
                '**/.vite/**',
            ],
        },
        include: ['packages/**/*.test.ts', 'scripts/**/*.test.ts', 'src/main/**/*.test.ts', 'src/preload/**/*.test.ts'],
    },
});
