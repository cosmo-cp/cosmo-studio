# Renderer (Next.js)

This folder contains the **renderer/UI** for the Cosmo Studio Electron app.

## Important constraints

- `next.config.ts` uses `output: "export"` so production builds are static and written to `src/renderer/out/`.
- In development, Electron loads the Next dev server at `http://localhost:3000`.
- Request/response data flows should use the bounded Zustand store plus feature SWR hooks; do not call `window.api` directly from components.

## Local development

Prefer running from the repo root:

```bash
cd ../..
npm run dev
```

If you want to run the renderer alone:

```bash
npm run dev
```

## Scripts

```bash
npm run dev     # Next dev (Turbopack)
npm run build   # Static export build to out/
npm run lint    # Next lint
npm run test    # Renderer Vitest suite via vitest.config.mts
```

## Data flow

- `src/app/providers.tsx` composes `StoreProvider`, `ThemeProvider`, and `UiFeedbackHost`.
- `src/lib/store/app-data-source.ts` resolves Electron preload versus browser-safe HTTP RPC once per renderer tree.
- Backend-backed request/response flows live in `src/features/*/*-api.ts` and `src/features/*/use-*-page-state.ts`.
- Renderer-only state lives in focused Zustand slices such as `src/features/chat/chat-store.ts`, `src/features/web-search/web-search-store.ts`, and `src/lib/store/ui-feedback-store.ts`.

## Process boundary

The renderer must talk to the main process via `window.api` (exposed by preload). Do not import Node/Electron APIs directly.
