# `apps/cosmo-desktop/src` (Electron main process) — AGENTS override

This file applies to changes under `apps/cosmo-desktop/src/`. Shared controllers, IPC decorators, feature flags, and runtime services live in `packages/backend-common/`, and the HTTP runtime lives in `apps/cosmo-http/src/`.

## Responsibilities (what belongs here)

- Electron app lifecycle + window management (entry: `apps/cosmo-desktop/src/index.ts`).
- Electron-only integration glue (e.g., `ElectronFolderPickerService`, `ElectronSecretStore`, `IpcHandlerRegistry` in `apps/cosmo-desktop/src/ipc/index.ts`, `NextPlugin` in `apps/cosmo-desktop/src/NextPlugin.ts`, `Electron` DI container in `apps/cosmo-desktop/src/inversify.config.ts`).
- Database initialization (`DatabaseManager.initialize(...)`) and fatal startup handling for Electron main.
- Logging setup for Electron main (`apps/cosmo-desktop/src/logger.ts`).

If logic can be **shared across Electron and HTTP** (or does not need Electron APIs), place it in `packages/backend-common/` or pure domain logic in `packages/core/` instead.

## IPC conventions (required)

- Shared controllers live in `packages/backend-common/controllers/*` using decorators in `packages/backend-common/ipc/Decorators.ts`:
    - `@IpcController("prefix")` on the class.
    - `@IpcHandler("name", z.tuple([...]))` for request/response (`ipcMain.handle`) and generated HTTP RPC.
    - `@IpcOn("name", z.tuple([...]))` for Electron-only fire-and-forget (`ipcMain.on`) used for streaming.
- `IpcHandlerRegistry` (`apps/cosmo-desktop/src/ipc/index.ts`) appends the Electron event as the **last** argument when invoking controller methods. If you need `event.sender`, add an `event: IpcMainEvent` parameter at the end.
- Do not call `ipcMain.handle/on` directly in controllers; keep the registration pattern centralized in `apps/cosmo-desktop/src/ipc/index.ts`.
- HTTP RPC does not pass an Electron event. Do not put HTTP-reused handler logic behind required Electron event parameters.
- After changing IPC handlers, run `npm run generate-api` to regenerate preload (`apps/cosmo-desktop/preload/rpc-api.ts`), `packages/contracts/*`, and `apps/cosmo-http/src/rpc-manifest.ts`.

## Database + migrations (runtime facts)

- Electron DB lives under `app.getPath('userData')`:
    - Dev uses folder name from `process.env.DATABASE_NAME` (required) in `apps/cosmo-desktop/src/index.ts`.
    - Prod uses folder name `"database"`.
- Core migrations are generated into `migrations/core/` via `npm run db:generate`.
- `vite.main.config.mts` copies `migrations/` into `.vite/build/migrations` at build time so runtime migrations (`migrations/core/`) can run inside the packaged app.

## Security and privacy

- Keep `contextIsolation: true` and `nodeIntegration: false` (set in `apps/cosmo-desktop/src/index.ts`).
- Never send secrets to the renderer:
    - API keys remain encrypted at rest and should only be used in main/core where required.
    - Avoid logging user prompts/messages if they may contain sensitive data.

## Packaging/build notes

- Main is bundled by Vite (`vite.main.config.mts`) through Electron Forge’s Vite plugin (`forge.config.ts`).
- Forge emits the preload as `.vite/preload/index.cjs`; the BrowserWindow preload path must match it.
- Root `postinstall` runs `scripts/patch-electron-forge-plugin-vite.mjs` to keep Forge's preload build compatible with the current Vite version.
- PGlite is treated as external (not bundled); Forge hooks copy `@electric-sql/*` into the packaged app.
- Renderer assets come from `apps/cosmo-web/out/` and are copied into the package via `apps/cosmo-desktop/src/NextPlugin.ts`.

## Logging

- Use `logger` from `apps/cosmo-desktop/src/logger.ts` (and `getCoreLogger()` in shared packages) and include stable identifiers (`chatId`, `providerId`) in messages.
- Prefer structured, actionable logs (what failed + which id + next step).

## Testing expectations (main / backend-common)

- Controllers must be tested for:
    - Argument validation behavior.
    - Error propagation/sanitization.
    - Side-effects on the core services (mocked via DI).
- Streaming paths must be tested with a fake `webContents` and asserted event emissions (`*-data`, `*-end`, `*-error`).
