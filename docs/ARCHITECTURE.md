# Architecture

Cosmo Studio is an Electron desktop application with a static-exported Next.js UI. It is organized as a workspace with a shared `core` package.

## High-level diagram

```
┌───────────────────────────────────────────────────────────┐
│                       Electron App                         │
│                                                           │
│  ┌───────────────┐      IPC       ┌─────────────────────┐ │
│  │ Renderer       │◀──────────────▶│ Main Process         │ │
│  │ (Next.js UI)   │   window.api   │ (Electron)           │ │
│  │ src/renderer   │                │ src/main             │ │
│  └───────▲───────┘                └─────────▲───────────┘ │
│          │                                   │             │
│          │ contextBridge                      │ DI + domain │
│  ┌───────┴────────┐                          │             │
│  │ Preload         │                          │             │
│  │ src/preload     │                          │             │
│  └────────────────┘                 ┌─────────┴───────────┐ │
│                                     │ Shared Core Package  │ │
│                                     │ packages/core (core) │ │
│                                     └─────────▲───────────┘ │
│                                               │             │
│                                               │ Drizzle ORM  │
│                                     ┌─────────┴───────────┐ │
│                                     │ PGlite DB +          │ │
│                                     │ Migrations           │ │
│                                     └─────────────────────┘ │
└───────────────────────────────────────────────────────────┘
```

## Key responsibilities

### Main process (`src/main`)

- App startup/lifecycle and `BrowserWindow` creation (`src/main/index.ts`).
- Database initialization (`DatabaseManager.initialize(...)`) and migration execution.
- IPC registration: controllers are registered via `IpcHandlerRegistry` (`src/main/ipc/index.ts`).
- Streaming orchestration that needs Electron `webContents.send` (`StreamingChatController`).
- Main logging (`src/main/logger.ts`) and update checks (`update-electron-app`).

### Preload (`src/preload`)

- Defines the renderer-accessible API surface (`window.api`) via `contextBridge`.
- `src/preload/api.ts` is generated from controller decorators using `scripts/generate-api.ts`.

### Renderer (`src/renderer`)

- Next.js App Router UI.
- Must use `window.api` for all privileged/data operations.
- Chat UI state is owned by Redux Toolkit under `src/renderer/src/store/*`.
    - `page.tsx` renders from selectors and dispatches thunks.
    - AI SDK `Chat` instances live in a module-level runtime registry so streams survive route changes and multiple chats can stream in parallel.
    - Runtime message snapshots are mirrored to Redux, then persisted through the message sync IPC queue.
- Production output is static (`next.config.ts` uses `output: "export"`), written to `src/renderer/out/`.

### Core package (`packages/core`)

- Shared DTOs and types (`packages/core/dto.ts`).
- Provider catalog metadata shared across processes (`packages/core/providerCatalog.ts`).
- Drizzle schema and DB manager (`packages/core/database/*`).
- Repositories and services (`packages/core/repositories/*`, `packages/core/services/*`).
- DI container (`packages/core/inversify.config.ts`) used as the parent container for main.
- Command registry and parsing utilities (`packages/core/commands/*`), including built-ins and user-defined commands stored in the DB.

### Command flow (high-level)

1. Renderer gathers commands for UI (settings + dropdown) through Redux thunks calling `window.api.command.listAll()`.
2. User submits a command (typed or selected).
3. A chat thunk resolves the command through `CommandController` → `CommandService`.
4. The resolved prompt is sent through the normal chat streaming pipeline.

### Chat persistence flow (high-level)

1. Renderer dispatches chat thunks for history, selection, model/persona updates, sending, stop, regenerate, and tool approvals.
2. A per-chat AI SDK runtime streams through `src/renderer/src/chat-transport.ts`.
3. Each runtime message update updates Redux and enqueues `message:syncForChat`.
4. Main validates the sync payload and `MessageRepository.syncForChat` accepts only newer per-chat sequence numbers.
5. `StreamingChatController` only streams model output; it no longer writes user/assistant messages directly to the database.

## Build pipeline (how packaging works)

### Development (`npm run dev`)

- Runs Next dev server (`src/renderer`) and Electron Forge start concurrently.
- Main loads the dev URL: `http://localhost:3000/splash` (see `src/main/index.ts`).

### Production (`npm run make` / `npm run package`)

1. Build renderer: `cd src/renderer && npm run build`
    - Produces static output under `src/renderer/out/`.
2. Electron Forge packaging:
    - Vite plugin builds main and preload (`vite.main.config.ts`, `vite.preload.config.ts`).
    - `NextPlugin` copies `src/renderer/out/` into the packaged renderer directory.
    - `@electric-sql/*` is copied into the package so PGlite works at runtime.
