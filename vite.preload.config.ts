import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        outDir: path.resolve(__dirname, '.vite/preload'),
        lib: {
            entry: './src/preload/index.ts',
            formats: ['cjs'],
        },
        sourcemap: true,
        emptyOutDir: true,
    },
});
