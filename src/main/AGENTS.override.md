# `src/main` (runtime processes) — AGENTS override

This file applies to changes under `src/main/`.

## Responsibilities (what belongs here)

- Electron app lifecycle + window management (entry: `src/main/index.ts`).
- HTTP service lifecycle + Nest bootstrap (entry: `src/main/http/index.ts`).
- Database initialization (`DatabaseManager.initialize(...)`) and fatal startup handling for both runtimes.
- IPC wiring and controller registration (`src/main/ipc/*`, `src/main/controllers/*`).
- Generated HTTP RPC dispatch (`src/main/http/RpcController.ts` and `src/main/http/rpc-manifest.ts`).
- Shared chat streaming orchestration (`src/main/services/ChatStreamingService.ts`).
- Integration glue that requires runtime primitives:
    - Electron `webContents.send` streaming in `StreamingChatController`.
    - HTTP response streaming in `ChatHttpController`.
- Logging setup for Electron main (`src/main/logger.ts`).

If logic can be **pure domain logic** (no Electron objects), it should live in `packages/core/` instead.

## IPC conventions (required)

- Controllers use decorators in `src/main/ipc/Decorators.ts`:
    - `@IpcController("prefix")` on the class.
    - `@IpcHandler("name", z.tuple([...]))` for request/response (`ipcMain.handle`) and generated HTTP RPC.
    - `@IpcOn("name", z.tuple([...]))` for Electron-only fire-and-forget (`ipcMain.on`) used for streaming.
- `IpcHandlerRegistry` appends the Electron event as the **last** argument when invoking controller methods. If you need `event.sender`, add an `event: IpcMainEvent` parameter at the end.
- Do not call `ipcMain.handle/on` directly in controllers; keep the registration pattern centralized in `src/main/ipc/index.ts`.
- HTTP RPC does not pass an Electron event. Do not put HTTP-reused handler logic behind required Electron event parameters.
- After changing IPC handlers, run `npm run generate-api` to regenerate preload and HTTP generated files.

## HTTP runtime conventions

- `src/main/http/index.ts` owns Nest startup, host/port envs, DB initialization, and MCP client initialization.
- `src/main/http/RpcController.ts` must keep the RPC envelope stable:
    - `{ok: true, result}`
    - `{ok: false, error: {code, message}}`
- `src/main/http/ChatHttpController.ts` is the HTTP delivery adapter for `ChatStreamingService`.
- Keep HTTP v1 local single-user by default: bind `127.0.0.1` unless explicitly configured otherwise.
- Generated file `src/main/http/rpc-manifest.ts` should not be edited manually.

## Database + migrations (runtime facts)

- Electron DB lives under `app.getPath('userData')`:
    - Dev uses folder name from `process.env.DATABASE_NAME` (required) in `src/main/index.ts`.
    - Prod uses folder name `"database"`.
- HTTP DB lives under `COSMO_HTTP_DATA_DIR/database`, defaulting to `.cosmo-http/database`.
- Migrations are generated into `migrations/` via `drizzle-kit`.
- `vite.main.config.ts` copies `migrations/` into `.vite/build/migrations` at build time so runtime migrations can run inside the packaged app.
- `vite.http.config.ts` copies `migrations/` into `.vite/http/migrations` for the built HTTP service.

## Security and privacy

- Keep `contextIsolation: true` and `nodeIntegration: false` (set in `src/main/index.ts`).
- Never send secrets to the renderer:
    - API keys remain encrypted at rest and should only be used in main/core where required.
    - Avoid logging user prompts/messages if they may contain sensitive data.

## Packaging/build notes

- Main is bundled by Vite (`vite.main.config.ts`) through Electron Forge’s Vite plugin (`forge.config.ts`).
- PGlite is treated as external (not bundled); Forge hooks copy `@electric-sql/*` into the packaged app.
- Renderer assets come from `src/renderer/out/` and are copied into the package via `src/NextPlugin.ts`.
- HTTP is bundled by `vite.http.config.ts`; renderer assets are copied to `.vite/http/public`.

## Logging

- Use `logger` from `src/main/logger.ts` and include stable identifiers (`chatId`, `providerId`) in messages.
- Prefer structured, actionable logs (what failed + which id + next step).

## Testing expectations (main)

- Controllers must be tested for:
    - Argument validation behavior.
    - Error propagation/sanitization.
    - Side-effects on the core services (mocked via DI).
- Streaming paths must be tested with a fake `webContents` and asserted event emissions (`*-data`, `*-end`, `*-error`).
