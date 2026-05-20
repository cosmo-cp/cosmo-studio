# IPC

Cosmo Studio uses a decorator-based IPC pattern so the Electron preload API and HTTP RPC surface can be generated from the same controller source of truth.

## Building blocks

- Decorators: `src/main/ipc/Decorators.ts`
    - `@IpcController("prefix")`
    - `@IpcHandler("name", z.tuple([...]))` -> request/response (`ipcMain.handle`) and HTTP RPC.
    - `@IpcOn("name", z.tuple([...]))` -> fire-and-forget (`ipcMain.on`), used for Electron streaming only.
- Registry: `src/main/ipc/index.ts` (`IpcHandlerRegistry`)
    - Discovers controller metadata and registers channels.
    - Channel naming: `${prefix}:${name}`
- HTTP RPC: `src/main/http/RpcController.ts`
  - Dispatches generated route metadata through `POST /api/rpc/:controller/:handler`.
  - Uses the same zod tuple schemas as IPC.

## Controller pattern

- Controllers live in `src/main/controllers/*`.
- Controllers are bound via DI in `src/main/inversify.config.ts` and injected into `IpcHandlerRegistry`.
- The registry passes the Electron event object as the **last** argument when calling controller methods.
    - If you need `event.sender` or `webContents`, declare an `event` parameter at the end.
- HTTP RPC does not pass an Electron event. Handlers that require Electron primitives should be `@IpcOn` adapters or Electron-only code.

## Generated preload API

- Generator: `scripts/generate-api.ts`
- Outputs:
  - `src/preload/api.ts`
  - `src/main/http/rpc-manifest.ts`
  - `src/renderer/src/lib/generated-http-api.ts`

The generator:

- Reads controller decorator metadata via `reflect-metadata`.
- Uses a regex on controller source files to infer method signatures.
- Fails when any `@IpcHandler` is missing a zod tuple schema.
- Emits a typed `api` object that calls:
    - `ipcRenderer.invoke(...)` for `@IpcHandler`
    - `ipcRenderer.send(...)` for `@IpcOn`
- Emits a typed HTTP client that calls:
  - `fetch("/api/rpc/:controller/:handler")` for `@IpcHandler`
  - no client methods for `@IpcOn`

## HTTP RPC conventions

- Route: `POST /api/rpc/:controller/:handler`
- Body: `{ "args": [...] }`
- Codec: SuperJSON for request and response payloads so `Date` values round-trip.
- Envelope:
  - success: `{ "ok": true, "result": value }`
  - failure: `{ "ok": false, "error": { "code": "...", "message": "..." } }`
- Stable error codes:
  - `NOT_FOUND`
  - `BAD_REQUEST`
  - `INTERNAL_ERROR`

### Streaming conventions

Streaming uses fire-and-forget channels plus renderer subscriptions:

- Main emits to renderer:
    - `${streamChannel}-data`
    - `${streamChannel}-end`
    - `${streamChannel}-error`
- Renderer wiring lives in:
    - `src/renderer/src/chat-transport.ts` (AI SDK transport)
    - `src/preload/api.ts` (subscription helpers)
- HTTP streaming uses `POST /api/chat` and `ChatHttpController`.
- `GET /api/chat/:chatId/stream` returns `204` in v1 and is reserved for future resume-stream support.

## Adding/changing an IPC API (required steps)

1. Implement the new handler in a controller:
    - Add `@IpcHandler(...)` or `@IpcOn(...)` to a public method.
2. Add a `z.tuple([...])` args schema to the decorator and keep any deeper domain validation in the controller/service.
3. Bind the controller (if new) in `src/main/inversify.config.ts`.
4. Bind RPC-reusable controllers through the generated manifest by rerunning `npm run generate-api`.
5. Update renderer usage through the app data source adapter or chat transport, not presentation components.
6. Add tests covering success + failure paths.

## Command endpoints

The `command` IPC group provides dynamic command management:

- `command:listAll` → list built-in + user-defined commands.
- `command:create` → create a custom command.
- `command:update` → update a custom command.
- `command:delete` → delete a custom command.
- `command:execute` → resolve a command string into its final prompt.

## ACP agent endpoints

The `acpAgent` IPC/RPC group manages local Agent Client Protocol agents:

- `acpAgent:getAll` → list redacted installed agents.
- `acpAgent:create` / `update` / `delete` → manage custom or registry-installed agents.
- `acpAgent:enable` / `disable` → toggle chat/workflow availability.
- `acpAgent:getRegistry` / `refreshRegistry` → read or refresh the cached ACP registry.
- `acpAgent:installFromRegistry` → create an installed agent from supported `npx`/`uvx` registry distributions.
- `acpAgent:test` → initialize a backend ACP session and return a serializable status.

## Security checklist

- Treat all renderer-provided values as untrusted.
- Don’t expose raw `ipcRenderer` or Node APIs to the renderer.
- Keep responses serializable; avoid sending class instances.
- Never return secrets to the renderer (API keys, tokens).
