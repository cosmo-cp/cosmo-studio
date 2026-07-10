# `Cosmo Studio` — AGENTS Guide (single source of truth)

This file is written for AI agents/LLMs and engineers working in this repo. It explains **how the project is structured**, **where code belongs**, **how to ship safely**, and **what quality bars are non‑negotiable**.

If you change architecture, workflows, scripts, or conventions, **update this file** (and the scoped `AGENTS.override.md` files) in the same PR.

For a quick product-capability index before planning or answering feature questions, read `docs/feature.md`.

## Project map (read this first)

Cosmo Studio is a dual-runtime app with a static-exported Next.js UI. It builds as an Electron desktop app and as a local NestJS HTTP service.

- **Electron main process**: `src/main/` (entry: `src/main/index.ts`)
    - Owns windows, app lifecycle, database initialization, IPC registration.
- **HTTP main process**: `src/main/http/` (entry: `src/main/http/index.ts`)
  - Owns Nest bootstrap, static renderer serving, generated RPC dispatch, HTTP chat streaming.
- **Preload (security boundary)**: `src/preload/` (entry: `src/preload/index.ts`)
    - Exposes a minimal, typed `window.api` via `contextBridge`.
    - `src/preload/api.ts` and the generated `src/preload/api/*` modules are generated (see “IPC & API generation”).
- **Renderer (Next.js UI)**: `src/renderer/` (Next app: `src/renderer/src/`)
    - Runs in the BrowserWindow or browser, talks to the active backend through adapter modules.
    - Next config is `output: "export"` (static build to `src/renderer/out/`).
  - Uses a single root Redux store; renderer components should dispatch thunks/selectors instead of calling preload APIs directly.
  - `NEXT_PUBLIC_COSMO_BACKEND=electron|http` selects preload or generated HTTP RPC.
- **Core package (domain + DB + AI)**: `packages/core/` (workspace package name: `core`)
    - Drizzle schema, repositories/services, DTOs shared across processes.
    - Imported as `core/...` from main/renderer/preload.
  - Platform concerns use injected interfaces such as `SecretStore` and `CoreLogger`.
- **ACP agents**: `packages/core/services/AcpAgentService.ts`, `packages/core/services/AcpRegistryService.ts`, `src/main/services/AcpAgentRuntimeService.ts`
  - Agent definitions and registry cache are shared domain data; process spawning and ACP provider sessions stay in main/HTTP runtime.
  - Renderer receives redacted agent views only; env values are never returned.
- **Tooling/scripts**: `scripts/` (currently: `scripts/generate-api.ts`)
    - Generates the preload API, HTTP RPC manifest, and renderer HTTP client from main IPC controllers.
- **Database**: Drizzle ORM + PGlite
    - Schema: `packages/core/database/schema/`
    - Migrations output: `migrations/`
    - Drizzle config: `drizzle.config.ts`
  - Electron and HTTP use separate default data directories.

Internal docs live in `docs/` (keep them updated):

- `docs/feature.md` - quick feature inventory and source map.
- `docs/ARCHITECTURE.md`
- `docs/IPC.md`
- `docs/DATABASE.md`
- `docs/RENDERER_DESIGN.md`
- `docs/TESTING_STRATEGY.md`
- `docs/DEPENDENCIES.md`
- `docs/specs/dual-runtime/runtime-targets.md`
- `docs/specs/dual-runtime/transport-contract.md`
- `docs/specs/dual-runtime/build-packaging.md`

## 1) Feature planning & code placement (strict)

Before coding, decide **where the feature belongs**. Default to keeping the renderer “dumb” and moving I/O + business logic out of it.

### Decision tree

1. **Pure UI/UX change (layout, styling, components, interaction)**  
   → `src/renderer/src/...`

2. **Needs OS access / Electron APIs / desktop app lifecycle**
   → `src/main/...`
   If the renderer needs it, expose a minimal IPC API via preload (see below).

3. **Needs HTTP service behavior / Nest endpoint / static serving**
   → `src/main/http/...`
   Keep reusable business logic outside Nest controllers when Electron also needs it.

4. **Database work (schema/repository/service) or cross-process domain logic**
   → `packages/core/...`
    - Schema changes → also create migrations (`npm run db:generate`) and validate (`npm run db:check`).

5. **AI/model provider logic** (providers, streaming, prompt assembly, tool calls)
   → Prefer `packages/core/...` for provider registry + model selection logic.
   → Keep shared chat streaming in `src/main/services/ChatStreamingService.ts`.
   → Keep Electron delivery in `StreamingChatController`; keep HTTP delivery in `ChatHttpController`.
   → ACP agent persistence/registry logic belongs in `packages/core`; ACP subprocess/session creation belongs in `src/main/services/AcpAgentRuntimeService.ts`.

6. **Shared types/DTOs**
   → `packages/core/dto.ts` (and types under `packages/core/types/`)

7. **Anything crossing the process boundary** (renderer ⇄ main/backend)
   → Add `@IpcHandler` in `src/main/controllers/*` with a zod tuple schema, then regenerate APIs.
   → Renderer components should use Redux thunks, `AppDataSource`, or `createChatTransport()`.

### Non‑negotiables

- Renderer **must not** import Node/Electron APIs directly.
- Preload is a security boundary: expose **capabilities**, not modules.
- All IPC and HTTP RPC input is untrusted: validate/sanitize with `zod` at the boundary.
- `packages/core` must not import Electron, `safeStorage`, or `src/main/logger`.

## 2) IPC & API generation (how `window.api` works)

We use a declarative IPC pattern:

- Decorators live in `src/main/ipc/Decorators.ts`
    - `@IpcController("prefix")` on controller classes
    - `@IpcHandler("method", z.tuple([...]))` for request/response APIs shared by Electron IPC and HTTP RPC
    - `@IpcOn("event", z.tuple([...]))` for Electron-only fire-and-forget events (used for streaming)
- Controllers live in `src/main/controllers/*` and are bound in `src/main/inversify.config.ts`; HTTP imports reusable controller constructors through the generated manifest.
- IPC registration happens in `src/main/ipc/index.ts` via `IpcHandlerRegistry`.

### Adding a new IPC API (checklist)

1. Add method to an existing controller (or create a new controller):
    - File: `src/main/controllers/<Something>Controller.ts`
    - Add `@IpcHandler("...")` (for invoke) or `@IpcOn("...")` (for send).
2. Add a `z.tuple([...])` schema to the decorator and keep any deeper domain validation in the controller/service.
3. Bind every new controller in `src/main/inversify.config.ts` with the same ServiceIdentifier type `TYPES.Controller`.
5. Run `npm run generate-api` (root) to regenerate `src/preload/api.ts`, `src/preload/api/*`, `src/main/http/rpc-manifest.ts`, and `src/renderer/src/lib/generated-http-api.ts`.
6. Ensure renderer components use the shared Redux store/thunks for request-response flows, and keep any direct `window.api` calls isolated to renderer adapter/transport modules.
7. Add tests (unit + integration) for the new behavior.

### Generated files policy

- `src/preload/api.ts` and the generated `src/preload/api/*.ts` modules are generated by `scripts/generate-api.ts`. Prefer **not** editing them manually.
- `src/main/http/rpc-manifest.ts` is generated by `scripts/generate-api.ts`. Prefer **not** editing it manually.
- `src/renderer/src/lib/generated-http-api.ts` is generated by `scripts/generate-api.ts`. Prefer **not** editing it manually.
- If the generator can’t express a new shape, update the generator and regenerate.

## 3) Frontend design guidelines (intuitive, accessible, mobile‑first)

The current UI (see screenshots in the PR description / repository) establishes:

- A **left app sidebar** (Cosmo logo + primary nav + Settings).
- A **content header** with utility actions (e.g., “Give us a Star on GitHub”, theme toggle).
- Card-based panels, neutral palette, rounded corners, soft borders.

### Design system and branding

- Use the existing Shadcn/Radix component primitives in `src/renderer/src/components/ui/`.
- Styling is Tailwind v4 + CSS variables in `src/renderer/src/app/globals.css` (neutral base, light/dark).
- Prefer consistent spacing/radius:
    - Outer containers use `rounded-lg`, `border`, `bg-background`.
    - Content widths: follow existing patterns like `max-w-3xl mx-auto` for inputs.
- Icons: `lucide-react` only.
- Theme: use `next-themes` and do not hardcode colors; use semantic tokens (e.g., `bg-background`, `text-foreground`, `border-border`).

### Accessibility (must)

- All interactive controls must be keyboard-accessible and have visible focus.
- Provide `aria-label` / `sr-only` text where the UI is icon-only.
- Add tooltip where the UI is icon-only.
- Maintain sufficient contrast in both themes; do not rely on color alone to convey state.
- Avoid `dangerouslySetInnerHTML` unless content is sanitized.

### Mobile-first and responsive

- Start from small screens: ensure the sidebar collapses/works, and main content does not overflow.
- Avoid fixed heights unless paired with `min-h-0`/`overflow-hidden` (see existing layout usage).
- Prefer container queries and responsive utilities already in use.

For renderer-specific implementation conventions, see `src/renderer/AGENTS.override.md`.

## 4) Development workflow (commands + expectations)

### Installation

- Root is an npm workspace: installs root + `packages/*` + `src/renderer`.
- Prefer running `npm install` once at the repo root.

### Day-to-day commands (root)

- `npm run dev` / `npm run dev:electron` — Run Next dev server + Electron in development.
- `npm run dev:http` — Run Nest HTTP service on `4000` + Next dev on `3000`.
- `npm run start` — Start Electron (development). Note: currently runs `npm i` first.
- `npm run generate-api` — Regenerate preload API, HTTP RPC manifest, and HTTP client from controllers.
- `npm run build:renderer:electron` — Static renderer export configured for Electron packaging.
- `npm run build:renderer:http` — Static renderer export configured for HTTP serving at `/`.
- `npm run build:http` — Generate APIs, build HTTP renderer, build Nest entry, copy renderer output and migrations.
- `npm run start:http` — Start the built HTTP service from `.vite/http/main.js`.
- `npm run lint` / `npm run fix` — Google TypeScript style (`gts`) lint/fix for main/preload/core/scripts.
- `npm run test` / `npm run test:watch` — Run Vitest suites for main/preload/core/scripts.
- `npm run db:generate` — Generate new migrations from schema changes.
- `npm run db:migrate` — Apply migrations to the configured DB (see `drizzle.config.ts`).
- `npm run db:studio` — Launch Drizzle Studio.
- `npm run package` / `npm run make` / `npm run publish` — Build Electron renderer then package/make/publish via Electron Forge.

### Renderer commands (`src/renderer`)

- `npm run dev` — Next dev (Turbopack).
- `npm run build` — Static export build (`output: "export"`) to `src/renderer/out/`.
- `npm run lint` — Next lint for UI code.
- `npm run test` / `npm run test:watch` — Run renderer component tests (Vitest + React Testing Library).

### CI mindset (even locally)

When you change code, always run:

1. Lints: `npm run lint` (root) and `npm run lint` in `src/renderer`
2. Tests: add/run targeted tests first, then full suite(`npm run test`) and Coverage(`npm run test:coverage`)
3. Build check: HTTP build (`npm run build:http`) and Electron package (`npm run package`)

## 5) Testing policy (strict, 100%+ mindset)

We target **100%+ meaningful coverage** (branch + line) for new/changed code. “Every line has a test” means:

- Every behavior branch has an assertion.
- No untested error handling.
- No untested IPC validation.
- No untested DB queries/repository behaviors.

### What to test

- `packages/core`: pure unit tests for services/repositories (mock DB boundary or use ephemeral PGlite).
- `src/main`: integration tests for controllers + IPC registration (mock Electron pieces where needed).
- `src/preload`: unit tests verifying the exposed API shape and argument validation.
- `src/renderer`: component tests for UI logic; behavior tests for flows.
- **Automation/E2E**: use Playwright (Electron mode) to cover full user flows (chat, provider management, settings).

If a test harness is missing for an area, create it as part of the change. If you can’t, stop and explain the blocker.

## 6) Security & vulnerability review (must)

- IPC and HTTP RPC are untrusted input: validate with `zod` and reject unknown fields.
- Never expose `fs`, `ipcRenderer`, or arbitrary Node APIs to the renderer.
- Keep `contextIsolation: true`, `nodeIntegration: false`.
- Never log secrets (API keys, tokens, full prompt content if it contains sensitive data).
- HTTP v1 is local single-user only; keep `COSMO_HTTP_HOST` defaulted to `127.0.0.1` unless an accepted auth/deployment spec says otherwise.
- Run dependency audits regularly:
    - `npm audit` at repo root
    - `npm audit` in `src/renderer`

## 7) Documentation policy (code + docs folder + README)

Documentation is part of the feature, not an afterthought.

- **Code-level docs**: add short comments _before each method_ explaining **why** it exists (not what the code literally does).
- **Docs folder**: architectural decisions, flows, and boundaries go in `docs/`.
- **README**: keep “getting started”, scripts, and release steps accurate.
- **This file**: update `AGENTS.md`/overrides when conventions change.

## 8) Maintainability & logging (make bugs easy to find)

Follow these rules:

- Use meaningful names, consistent formatting, and keep functions small.
- Minimize nesting; use early returns.
- Prefer SRP (single responsibility), loose coupling, high cohesion.
- Avoid globals; remove dead code.

Logging:

- Use `electron-log` scopes:
    - Electron main: `src/main/logger.ts` (`logger = log.scope("main")`)
    - renderer: `src/renderer/logger.ts` (`logger = log.scope("renderer")`)
- Core code uses `CoreLogger`; bind runtime-specific implementations at startup instead of importing runtime loggers from `packages/core`.
- Log at critical steps (startup, DB init/migrations, IPC entry/exit, AI stream start/end/error).
- Include stable identifiers (chatId, providerId) but never include secrets.

## 9) Dependency reference (official docs)

Prefer official docs when changing behavior:

For an exhaustive per-package link list (from `package.json` files), see `docs/DEPENDENCIES.md`.

### App/runtime

- Electron: https://www.electronjs.org/docs/latest
- Electron Forge: https://www.electronforge.io/
- Vite: https://vite.dev/
- Next.js: https://nextjs.org/docs
- React: https://react.dev/

### AI stack

- Vercel AI SDK (`ai`, `@ai-sdk/*`): https://sdk.vercel.ai/docs
- Anthropic provider: https://sdk.vercel.ai/providers/anthropic
- OpenAI provider: https://sdk.vercel.ai/providers/openai
- Google provider: https://sdk.vercel.ai/providers/google
- Ollama provider (community): https://www.npmjs.com/package/ollama-ai-provider-v2
- models.dev registry: https://models.dev/

### Data layer

- Drizzle ORM: https://orm.drizzle.team/
- Drizzle Kit: https://orm.drizzle.team/kit-docs/overview
- PGlite: https://pglite.dev/
- Zod: https://zod.dev/

### UI

- Tailwind CSS v4: https://tailwindcss.com/docs
- Radix UI: https://www.radix-ui.com/primitives/docs/overview/introduction
- shadcn/ui: https://ui.shadcn.com/
- lucide-react: https://lucide.dev/

<!-- NEXT-AGENTS-MD-START -->[Next.js Docs Index]|root: ./.next-docs|STOP. What you remember about Next.js is WRONG for this project. Always search docs and read before any task.|If docs missing, run this command first: npx @next/codemod agents-md --output AGENTS.md<!-- NEXT-AGENTS-MD-END -->
