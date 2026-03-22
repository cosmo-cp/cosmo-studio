# `src/main` (Electron main process) — AGENTS override

This file applies to changes under `src/main/`.

## Responsibilities (what belongs here)

- Electron app lifecycle + window management (entry: `src/main/index.ts`).
- Database initialization (`DatabaseManager.initialize(...)`) and fatal startup handling.
- IPC wiring and controller registration (`src/main/ipc/*`, `src/main/controllers/*`).
- Integration glue that requires Electron objects (e.g., `webContents.send` streaming).
- Logging setup for main (`src/main/logger.ts`).

If logic can be **pure domain logic** (no Electron objects), it should live in `packages/core/` instead.

## IPC conventions (required)

- Controllers use decorators in `src/main/ipc/Decorators.ts`:
    - `@IpcController("prefix")` on the class.
    - `@IpcHandler("name")` for request/response (`ipcMain.handle`).
    - `@IpcOn("name")` for fire-and-forget (`ipcMain.on`) used for streaming.
- `IpcHandlerRegistry` appends the Electron event as the **last** argument when invoking controller methods. If you need `event.sender`, add an `event: IpcMainEvent` parameter at the end.
- Do not call `ipcMain.handle/on` directly in controllers; keep the registration pattern centralized in `src/main/ipc/index.ts`.
- After changing IPC handlers, run `npm run generate-api` to regenerate `src/preload/api.ts`.

## Database + migrations (runtime facts)

- DB lives under `app.getPath('userData')`:
    - Dev uses folder name from `process.env.DATABASE_NAME` (required) in `src/main/index.ts`.
    - Prod uses folder name `"database"`.
- Migrations are generated into `migrations/` via `drizzle-kit`.
- `vite.main.config.ts` copies `migrations/` into `.vite/build/migrations` at build time so runtime migrations can run inside the packaged app.

## Security and privacy

- Keep `contextIsolation: true` and `nodeIntegration: false` (set in `src/main/index.ts`).
- Never send secrets to the renderer:
    - API keys remain encrypted at rest and should only be used in main/core where required.
    - Avoid logging user prompts/messages if they may contain sensitive data.

## Packaging/build notes

- Main is bundled by Vite (`vite.main.config.ts`) through Electron Forge’s Vite plugin (`forge.config.ts`).
- PGlite is treated as external (not bundled); Forge hooks copy `@electric-sql/*` into the packaged app.
- Renderer assets come from `src/renderer/out/` and are copied into the package via `src/NextPlugin.ts`.

## Logging

- Use `logger` from `src/main/logger.ts` and include stable identifiers (`chatId`, `providerId`) in messages.
- Prefer structured, actionable logs (what failed + which id + next step).

## Testing expectations (main)

- Controllers must be tested for:
    - Argument validation behavior.
    - Error propagation/sanitization.
    - Side-effects on the core services (mocked via DI).
- Streaming paths must be tested with a fake `webContents` and asserted event emissions (`*-data`, `*-end`, `*-error`).
