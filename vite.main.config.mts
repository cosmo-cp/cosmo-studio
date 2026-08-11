import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const dirname = path.dirname(fileURLToPath(import.meta.url));

// Custom Vite plugin to copy the migrations folder
const copyMigrationsPlugin = () => {
    return {
        name: 'copy-migrations',
        // Hook into the build process after all modules are bundled but before the final output
        closeBundle: function () {
            // Define source and destination paths relative to the project root
            const sourceDir = path.resolve(dirname, 'migrations');
            const targetDir = path.resolve(dirname, '.vite/build', 'migrations');

            console.log(`[Vite Plugin] Copying migrations from ${sourceDir} to ${targetDir}`);

            try {
                if (!fs.existsSync(targetDir)) {
                    fs.mkdirSync(targetDir, { recursive: true });
                }
                fs.cpSync(sourceDir, targetDir, { recursive: true });
                console.log('Migrations folder copied successfully.');
            } catch (e) {
                console.error('Failed to copy migrations folder:', e);
            }
        },
    };
};

export default defineConfig({
    resolve: {
        tsconfigPaths: true,
    },
    optimizeDeps: {
        exclude: ['@electric-sql/pglite'],
    },
    build: {
        // Mark PGlite as external so Vite does not bundle it
        rollupOptions: {
            external: ['@electric-sql/pglite'],
        },
        outDir: path.resolve(dirname, '.vite/build'),
        lib: {
            entry: './src/main/index.ts',
            formats: ['cjs'],
            fileName: 'main',
        },
        sourcemap: true,
        emptyOutDir: true, // Ensures a clean build every time
    },
    // Add the custom plugin to the plugins array
    plugins: [copyMigrationsPlugin()],
});
