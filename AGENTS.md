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
    - `src/preload/api.ts`, `src/preload/rpc-api.ts`, and the generated `src/preload/contracts/*`, `src/preload/api/*`, `src/preload/http-api/*` modules are generated (see “IPC & API generation”).
- **Renderer (Next.js UI)**: `src/renderer/` (Next app: `src/renderer/src/`)
    - Runs in the BrowserWindow or browser, talks to the active backend through a bounded Zustand store, feature SWR hooks, and chat transport adapters.
    - Next config is `output: "export"` (static build to `src/renderer/out/`).
    - Uses a single bounded Zustand store created in `src/renderer/src/lib/store/store.ts` and mounted in `src/renderer/src/app/store-provider.tsx`; `StoreProvider` also owns the renderer SWR cache.
    - Request/response flows go through feature-owned SWR hooks under `src/renderer/src/features/*/*-api.ts`, all built on `src/renderer/src/lib/store/backend-hooks.ts`, while renderer-only state stays in focused slices.
    - Feature orchestration belongs in `src/renderer/src/features/*/use-*-page-state.ts`; keep page/components presentational where possible.
    - Reusable renderer UI components belong in `src/renderer/src/components/`; do not place shared components under `src/renderer/src/features/`.
    - Backend resolution lives in `src/renderer/src/lib/store/app-data-source.ts`; user-facing toasts are queued in `src/renderer/src/lib/store/ui-feedback-store.ts` and rendered by `src/renderer/src/components/ui-feedback-host.tsx`.
    - `NEXT_PUBLIC_COSMO_BACKEND=electron|http` selects `window.api` versus the browser-safe `httpApi` exported from `src/preload/api.ts`.
- **Core package (domain + DB + AI)**: `packages/core/` (workspace package name: `core`)
    - Drizzle schema, repositories/services, DTOs shared across processes.
    - Imported as `core/...` from main/renderer/preload.
    - Platform concerns use injected interfaces such as `SecretStore` and `CoreLogger`.
- **ACP agents**: `packages/core/services/AcpAgentService.ts`, `packages/core/services/AcpRegistryService.ts`, `src/main/services/AcpAgentRuntimeService.ts`
    - Agent definitions and registry cache are shared domain data; process spawning and ACP provider sessions stay in main/HTTP runtime.
    - Renderer receives redacted agent views only; env values are never returned.
- **Tooling/scripts**: `scripts/`
    - `scripts/generate-api.ts` generates the preload RPC modules, browser-safe HTTP API modules, and HTTP RPC manifest from main IPC controllers.
    - `scripts/patch-electron-forge-plugin-vite.mjs` patches Electron Forge's preload Vite config after install for the current Vite compatibility issue.
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
   → Reusable renderer components must live in `src/renderer/src/components/`.
   → Keep feature-specific orchestration, hooks, and state in `src/renderer/src/features/*`.

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
   → Renderer components should use feature hooks/page-state hooks backed by `useBackendQuery()`, `useBackendMutation()`, or `createChatTransport()`.

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
4. Run `npm run generate-api` (root) to regenerate `src/preload/api.ts`, `src/preload/rpc-api.ts`, `src/preload/contracts/*`, `src/preload/api/*`, `src/preload/http-api/*`, and `src/main/http/rpc-manifest.ts`.
5. Ensure renderer components use the shared Zustand store plus feature backend/page-state hooks for request-response flows, and keep any direct transport calls isolated to `src/renderer/src/lib/store/app-data-source.ts` and `src/renderer/src/chat-transport.ts`.
6. Add tests (unit + integration) for the new behavior.

### Generated files policy

- `src/preload/api.ts`, `src/preload/rpc-api.ts`, and the generated `src/preload/contracts/*.ts`, `src/preload/api/*.ts`, `src/preload/http-api/*.ts` modules are generated by `scripts/generate-api.ts`. Prefer **not** editing them manually.
- `src/main/http/rpc-manifest.ts` is generated by `scripts/generate-api.ts`. Prefer **not** editing it manually.
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
- Root `postinstall` applies a local compatibility patch to `@electron-forge/plugin-vite` so Electron preload packaging stays clean under the current Vite version.

### Day-to-day commands (root)

- `npm run dev` / `npm run dev:electron` — Run Next dev server + Electron in development.
- `npm run dev:http` — Run Nest HTTP service on `4000` + Next dev on `3000`.
- `npm run start` — Start Electron (development). Note: currently runs `npm i` first.
- `npm run generate-api` — Regenerate preload API, HTTP RPC manifest, and HTTP client from controllers.
- `npm run sync-provider-packages` — Install/update AI SDK provider packages declared by `packages/core/provider-registry/registry.json`.
- `npm run build:renderer:electron` — Static renderer export configured for Electron packaging.
- `npm run build:renderer:http` — Static renderer export configured for HTTP serving at `/`.
- `npm run build:http` — Generate APIs, build HTTP renderer, build Nest entry, copy renderer output and migrations.
- `npm run start:http` — Start the built HTTP service from `.vite/http/main.js`.
- `npm run lint` / `npm run fix` — Google TypeScript style (`gts`) lint/fix for main/preload/core/scripts.
- `npm run test` / `npm run test:watch` — Run Vitest suites for main/preload/core/scripts via `vitest.config.mts`.
- `npm run db:generate` — Generate new migrations from schema changes.
- `npm run db:migrate` — Apply migrations to the configured DB (see `drizzle.config.ts`).
- `npm run db:studio` — Launch Drizzle Studio.
- `npm run package` / `npm run make` / `npm run publish` — Build Electron renderer then package/make/publish via Electron Forge.

### Renderer commands (`src/renderer`)

- `npm run dev` — Next dev (Turbopack).
- `npm run build` — Static export build (`output: "export"`) to `src/renderer/out/`.
- `npm run lint` — Next lint for UI code.
- `npm run test` / `npm run test:watch` — Run renderer component tests (Vitest + React Testing Library) via `src/renderer/vitest.config.mts`.

### CI mindset (even locally)

When you change code, always run:

1. Lints: `npm run lint` (root) and `npm run lint` in `src/renderer`
2. Formatting: run `npm run prettier -- --write <changed files>` after every code change
3. Tests: add/run targeted tests first, then full suite(`npm run test`) and Coverage(`npm run test:coverage`)
4. Build check: HTTP build (`npm run build:http`) and Electron package (`npm run package`)

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
- Reuse existing code, generated contracts, and shared helpers whenever possible; do not duplicate logic or type definitions unless a process/runtime boundary truly requires a separate implementation.
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
- Ollama provider (community): https://www.npmjs.com/package/ai-sdk-ollama
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

<!-- NEXT-AGENTS-MD-START -->[Next.js Docs Index]|root: ./node_modules/next/dist/docs|STOP. What you remember about Next.js is WRONG for this project. Always search docs and read before any task.|If docs missing, run this command first: npx @next/codemod agents-md --output AGENTS.md|01-app:{04-glossary.md}|01-app/01-getting-started:{01-installation.md,02-project-structure.md,03-layouts-and-pages.md,04-linking-and-navigating.md,05-server-and-client-components.md,06-fetching-data.md,07-mutating-data.md,08-caching.md,09-revalidating.md,10-error-handling.md,11-css.md,12-images.md,13-fonts.md,14-metadata-and-og-images.md,15-route-handlers.md,16-proxy.md,17-deploying.md,18-upgrading.md}|01-app/02-guides:{adopting-partial-prefetching.md,ai-agents.md,analytics.md,authentication.md,backend-for-frontend.md,building.md,caching-without-cache-components.md,cdn-caching.md,ci-build-caching.md,content-security-policy.md,css-in-js.md,custom-server.md,data-security.md,debugging.md,deploying-to-platforms.md,draft-mode.md,environment-variables.md,forms.md,how-revalidation-works.md,incremental-static-regeneration-cache-components.md,incremental-static-regeneration.md,instant-navigation.md,instrumentation.md,interactive-apps.md,internationalization.md,json-ld.md,lazy-loading.md,local-development.md,mcp.md,mdx.md,memory-usage.md,migrating-to-cache-components.md,multi-tenant.md,multi-zones.md,offline-support.md,open-telemetry.md,package-bundling.md,ppr-platform-guide.md,prefetching.md,preserving-ui-state.md,preventing-flash-before-hydration.md,production-checklist.md,progressive-web-apps.md,public-static-pages.md,redirecting.md,rendering-philosophy.md,runtime-prefetching.md,sass.md,scripts.md,self-hosting.md,server-actions.md,single-page-applications.md,static-exports.md,streaming.md,tailwind-v3-css.md,third-party-libraries.md,videos.md,view-transitions.md}|01-app/02-guides/migrating:{app-router-migration.md,from-create-react-app.md,from-vite.md}|01-app/02-guides/testing:{cypress.md,jest.md,playwright.md,vitest.md}|01-app/02-guides/upgrading:{codemods.md,version-14.md,version-15.md,version-16.md}|01-app/03-api-reference:{07-edge.md,08-turbopack.md}|01-app/03-api-reference/01-directives:{use-cache-private.md,use-cache-remote.md,use-cache.md,use-client.md,use-server.md}|01-app/03-api-reference/02-components:{font.md,form.md,image.md,link.md,script.md}|01-app/03-api-reference/03-file-conventions/01-metadata:{app-icons.md,manifest.md,opengraph-image.md,robots.md,sitemap.md}|01-app/03-api-reference/03-file-conventions/02-route-segment-config:{dynamicParams.md,instant.md,maxDuration.md,preferredRegion.md,prefetch.md,runtime.md}|01-app/03-api-reference/03-file-conventions:{default.md,dynamic-routes.md,error.md,forbidden.md,instrumentation-client.md,instrumentation.md,intercepting-routes.md,layout.md,loading.md,mdx-components.md,middleware.md,not-found.md,page.md,parallel-routes.md,proxy.md,public-folder.md,route-groups.md,route.md,src-folder.md,template.md,unauthorized.md}|01-app/03-api-reference/04-functions:{after.md,cacheLife.md,cacheTag.md,catchError.md,connection.md,cookies.md,draft-mode.md,fetch.md,forbidden.md,generate-image-metadata.md,generate-metadata.md,generate-sitemaps.md,generate-static-params.md,generate-viewport.md,headers.md,image-response.md,io.md,next-request.md,next-response.md,next-root-params.md,not-found.md,permanentRedirect.md,redirect.md,refresh.md,revalidatePath.md,revalidateTag.md,unauthorized.md,unstable_cache.md,unstable_noStore.md,unstable_rethrow.md,updateTag.md,use-link-status.md,use-offline.md,use-params.md,use-pathname.md,use-report-web-vitals.md,use-router.md,use-search-params.md,use-selected-layout-segment.md,use-selected-layout-segments.md,userAgent.md}|01-app/03-api-reference/05-config/01-next-config-js:{adapterPath.md,allowedDevOrigins.md,appDir.md,assetPrefix.md,authInterrupts.md,basePath.md,cacheComponents.md,cacheHandlers.md,cacheLife.md,compress.md,crossOrigin.md,cssChunking.md,deploymentId.md,devIndicators.md,distDir.md,env.md,expireTime.md,exportPathMap.md,generateBuildId.md,generateEtags.md,headers.md,htmlLimitedBots.md,httpAgentOptions.md,images.md,incrementalCacheHandlerPath.md,inlineCss.md,instrumentationClientInject.md,logging.md,mdxRs.md,onDemandEntries.md,optimizePackageImports.md,output.md,outputHashSalt.md,pageExtensions.md,partialPrefetching.md,poweredByHeader.md,prefetchInlining.md,productionBrowserSourceMaps.md,proxyClientMaxBodySize.md,reactCompiler.md,reactMaxHeadersLength.md,reactStrictMode.md,redirects.md,rewrites.md,sassOptions.md,serverActions.md,serverComponentsHmrCache.md,serverExternalPackages.md,staleTimes.md,staticGeneration.md,supportsImmutableAssets.md,taint.md,trailingSlash.md,transpilePackages.md,turbopack.md,turbopackChunking.md,turbopackFileSystemCache.md,turbopackIgnoreIssue.md,turbopackLocalPostcssConfig.md,turbopackMemoryEviction.md,turbopackRustReactCompiler.md,typedRoutes.md,typescript.md,urlImports.md,useLightningcss.md,useOffline.md,useTypeScriptCli.md,webVitalsAttribution.md,webpack.md}|01-app/03-api-reference/05-config:{02-typescript.md,03-eslint.md}|01-app/03-api-reference/06-cli:{create-next-app.md,next.md}|01-app/03-api-reference/07-adapters:{01-configuration.md,02-creating-an-adapter.md,03-api-reference.md,04-testing-adapters.md,05-routing-with-next-routing.md,06-implementing-ppr-in-an-adapter.md,07-runtime-integration.md,08-invoking-entrypoints.md,09-output-types.md,10-routing-information.md,11-use-cases.md,12-immutable-static-assets.md}|02-pages/01-getting-started:{01-installation.md,02-project-structure.md,04-images.md,05-fonts.md,06-css.md,11-deploying.md}|02-pages/02-guides:{analytics.md,authentication.md,babel.md,ci-build-caching.md,content-security-policy.md,css-in-js.md,custom-server.md,debugging.md,draft-mode.md,environment-variables.md,forms.md,incremental-static-regeneration.md,instrumentation.md,internationalization.md,lazy-loading.md,mdx.md,multi-zones.md,open-telemetry.md,package-bundling.md,post-css.md,preview-mode.md,production-checklist.md,redirecting.md,sass.md,scripts.md,self-hosting.md,static-exports.md,tailwind-v3-css.md,third-party-libraries.md}|02-pages/02-guides/migrating:{app-router-migration.md,from-create-react-app.md,from-vite.md}|02-pages/02-guides/testing:{cypress.md,jest.md,playwright.md,vitest.md}|02-pages/02-guides/upgrading:{codemods.md,version-10.md,version-11.md,version-12.md,version-13.md,version-14.md,version-9.md}|02-pages/03-building-your-application/01-routing:{01-pages-and-layouts.md,02-dynamic-routes.md,03-linking-and-navigating.md,05-custom-app.md,06-custom-document.md,07-api-routes.md,08-custom-error.md}|02-pages/03-building-your-application/02-rendering:{01-server-side-rendering.md,02-static-site-generation.md,04-automatic-static-optimization.md,05-client-side-rendering.md}|02-pages/03-building-your-application/03-data-fetching:{01-get-static-props.md,02-get-static-paths.md,03-get-server-side-props.md,05-client-side.md}|02-pages/03-building-your-application/06-configuring:{12-error-handling.md}|02-pages/04-api-reference:{06-edge.md,08-turbopack.md}|02-pages/04-api-reference/01-components:{font.md,form.md,head.md,image-legacy.md,image.md,link.md,script.md}|02-pages/04-api-reference/02-file-conventions:{instrumentation.md,proxy.md,public-folder.md,src-folder.md}|02-pages/04-api-reference/03-functions:{get-initial-props.md,get-server-side-props.md,get-static-paths.md,get-static-props.md,next-request.md,next-response.md,use-params.md,use-report-web-vitals.md,use-router.md,use-search-params.md,userAgent.md}|02-pages/04-api-reference/04-config/01-next-config-js:{adapterPath.md,allowedDevOrigins.md,assetPrefix.md,basePath.md,bundlePagesRouterDependencies.md,compress.md,crossOrigin.md,deploymentId.md,devIndicators.md,distDir.md,env.md,exportPathMap.md,generateBuildId.md,generateEtags.md,headers.md,httpAgentOptions.md,images.md,logging.md,onDemandEntries.md,optimizePackageImports.md,output.md,pageExtensions.md,poweredByHeader.md,productionBrowserSourceMaps.md,proxyClientMaxBodySize.md,reactStrictMode.md,redirects.md,rewrites.md,serverExternalPackages.md,trailingSlash.md,transpilePackages.md,turbopack.md,typescript.md,urlImports.md,useLightningcss.md,useTypeScriptCli.md,webVitalsAttribution.md,webpack.md}|02-pages/04-api-reference/04-config:{01-typescript.md,02-eslint.md}|02-pages/04-api-reference/05-cli:{create-next-app.md,next.md}|02-pages/04-api-reference/06-adapters:{01-configuration.md,02-creating-an-adapter.md,03-api-reference.md,04-testing-adapters.md,05-routing-with-next-routing.md,06-runtime-integration.md,07-invoking-entrypoints.md,08-output-types.md,09-routing-information.md,10-use-cases.md}|03-architecture:{accessibility.md,fast-refresh.md,nextjs-compiler.md,supported-browsers.md}|04-community:{01-contribution-guide.md,02-rspack.md}<!-- NEXT-AGENTS-MD-END -->
