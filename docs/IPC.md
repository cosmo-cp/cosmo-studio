# IPC

Cosmo Studio uses a decorator-based IPC pattern so the preload API can be generated and kept type-safe.

## Building blocks

- Decorators: `src/main/ipc/Decorators.ts`
    - `@IpcController("prefix")`
    - `@IpcHandler("name")` → request/response (`ipcMain.handle`)
    - `@IpcOn("name")` → fire-and-forget (`ipcMain.on`)
- Registry: `src/main/ipc/index.ts` (`IpcHandlerRegistry`)
    - Discovers controller metadata and registers channels.
    - Channel naming: `${prefix}:${name}`

## Controller pattern

- Controllers live in `src/main/controllers/*`.
- Controllers are bound via DI in `src/main/inversify.config.ts` and injected into `IpcHandlerRegistry`.
- The registry passes the Electron event object as the **last** argument when calling controller methods.
    - If you need `event.sender` or `webContents`, declare an `event` parameter at the end.

## Generated preload API

- Generator: `scripts/generate-api.ts`
- Output: `src/preload/api.ts`

The generator:

- Reads controller decorator metadata via `reflect-metadata`.
- Uses a regex on controller source files to infer method signatures.
- Emits a typed `api` object that calls:
    - `ipcRenderer.invoke(...)` for `@IpcHandler`
    - `ipcRenderer.send(...)` for `@IpcOn`

### Streaming conventions

Streaming uses fire-and-forget channels plus renderer subscriptions:

- Main emits to renderer:
    - `${streamChannel}-data`
    - `${streamChannel}-end`
    - `${streamChannel}-error`
- Renderer wiring lives in:
    - `src/renderer/src/chat-transport.ts` (AI SDK transport)
    - `src/preload/api.ts` (subscription helpers)

### Chat message sync

The chat renderer persists AI SDK UI state through `message:syncForChat`.

- Request DTO: `ChatMessageSyncInput`
    - `chatId`
    - monotonic per-chat `sequence`
    - serialized `UIMessage[]`
- Response DTO: `ChatMessageSyncAck`
    - `accepted: false` means main ignored a stale sequence.
- The controller validates the payload with `zod`.
- The repository replaces the stored message snapshot for that chat inside one transaction and updates chat preview fields.
- Streaming chunks still use `${streamChannel}-data/end/error`; final persistence does not happen in `StreamingChatController`.

## Adding/changing an IPC API (required steps)

1. Implement the new handler in a controller:
    - Add `@IpcHandler(...)` or `@IpcOn(...)` to a public method.
2. Validate inputs (prefer `zod`) at the boundary.
3. Bind the controller (if new) in `src/main/inversify.config.ts`.
4. Run `npm run generate-api`.
    - If unrelated project type errors block codegen, fix those first; `src/preload/api.ts` should remain generated output plus only narrowly scoped manual repair when the generator cannot express an existing signature.
5. Update renderer usage through `window.api`.
6. Add tests covering success + failure paths.

## Command endpoints

The `command` IPC group provides dynamic command management:

- `command:listAll` → list built-in + user-defined commands.
- `command:create` → create a custom command.
- `command:update` → update a custom command.
- `command:delete` → delete a custom command.
- `command:execute` → resolve a command string into its final prompt.

## Security checklist

- Treat all renderer-provided values as untrusted.
- Don’t expose raw `ipcRenderer` or Node APIs to the renderer.
- Keep responses serializable; avoid sending class instances.
- Never return secrets to the renderer (API keys, tokens).
