import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    build: {
        outDir: path.resolve(dirname, '.vite/preload'),
        lib: {
            entry: './src/preload/index.ts',
            formats: ['cjs'],
        },
        rollupOptions: {
            onwarn: function (warning, defaultHandler) {
                if (warning.message.includes('inlineDynamicImports option is deprecated')) {
                    return;
                }

                defaultHandler(warning);
            },
        },
        sourcemap: true,
        emptyOutDir: true,
    },
});
