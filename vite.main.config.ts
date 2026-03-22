import { defineConfig } from 'vite';
import path from 'path';
import fs from 'fs';
import tsconfigPaths from 'vite-tsconfig-paths';

// Custom Vite plugin to copy the migrations folder
const copyMigrationsPlugin = () => ({
    name: 'copy-migrations',
    // Hook into the build process after all modules are bundled but before the final output
    closeBundle() {
        // Define source and destination paths relative to the project root
        const sourceDir = path.resolve(__dirname, 'migrations');
        const targetDir = path.resolve(__dirname, '.vite/build', 'migrations');

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
});

export default defineConfig({
    optimizeDeps: {
        exclude: ['@electric-sql/pglite'],
    },
    build: {
        // Mark PGlite as external so Vite does not bundle it
        rollupOptions: {
            external: ['@electric-sql/pglite'],
        },
        outDir: path.resolve(__dirname, '.vite/build'),
        lib: {
            entry: './src/main/index.ts',
            formats: ['cjs'],
            fileName: 'main',
        },
        sourcemap: true,
        emptyOutDir: true, // Ensures a clean build every time
    },
    // Add the custom plugin to the plugins array
    plugins: [tsconfigPaths(), copyMigrationsPlugin()],
});
