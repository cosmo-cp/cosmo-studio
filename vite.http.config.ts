import {defineConfig} from "vite";
import path from "path";
import fs from "fs";
import tsconfigPaths from "vite-tsconfig-paths";

const copyRuntimeAssetsPlugin = () => ({
    name: "copy-http-runtime-assets",
    closeBundle() {
        const outDir = path.resolve(__dirname, ".vite/http");
        const migrationsSource = path.resolve(__dirname, "migrations");
        const migrationsTarget = path.resolve(outDir, "migrations");
        const rendererSource = path.resolve(__dirname, "src/renderer/out");
        const rendererTarget = path.resolve(outDir, "public");

        fs.mkdirSync(migrationsTarget, {recursive: true});
        fs.cpSync(migrationsSource, migrationsTarget, {recursive: true});

        if (fs.existsSync(rendererSource)) {
            fs.mkdirSync(rendererTarget, {recursive: true});
            fs.cpSync(rendererSource, rendererTarget, {recursive: true});
        }
    },
});

export default defineConfig({
    ssr: {
        noExternal: ["core"],
    },
    build: {
        ssr: "./src/main/http/index.ts",
        target: "node20",
        rollupOptions: {
            external: ["@electric-sql/pglite"],
            output: {
                entryFileNames: "main.js",
                format: "cjs",
            },
        },
        outDir: path.resolve(__dirname, ".vite/http"),
        sourcemap: true,
        emptyOutDir: true,
    },
    plugins: [
        tsconfigPaths(),
        copyRuntimeAssetsPlugin(),
    ],
});
