# `apps/cosmo-desktop/preload` (preload security boundary) — AGENTS override

This file applies to changes under `apps/cosmo-desktop/preload/` (and generated shared contracts under `packages/contracts/`).

## Purpose

Preload is the **only** place where we bridge data/capabilities from Electron to the renderer via `contextBridge`.

- Entry: `apps/cosmo-desktop/preload/index.ts`
- Exposed API: `window.api`
- Electron preload barrel: `apps/cosmo-desktop/preload/rpc-api.ts`
- Browser-safe shared API & generated contracts/HTTP clients: `packages/contracts/api.ts`, `packages/contracts/contracts/*.ts`, `packages/contracts/api/*.ts`, `packages/contracts/http-api/*.ts`

## Security rules (non-negotiable)

- Expose **minimal capability APIs** only. Never expose:
    - `fs`, `path`, `child_process`, or any Node/Electron modules
    - raw `ipcRenderer`
- All inputs from the renderer are untrusted:
    - validate arguments (prefer `zod`) at the first trust boundary (usually in main controllers)
    - keep data serializable (structured clone friendly)
- Don’t create new global objects in `window` other than what’s explicitly required.

## Generated file policy

- `apps/cosmo-desktop/preload/rpc-api.ts`, `packages/contracts/api.ts`, `packages/contracts/contracts/*.ts`, `packages/contracts/api/*.ts`, `packages/contracts/http-api/*.ts`, and `apps/cosmo-http/src/rpc-manifest.ts` are produced by `scripts/generate-api.ts`.
- Do not hand-edit the generated preload API or `packages/contracts/*` files unless you are also updating the generator to make the change reproducible.
- After updating IPC controllers/decorators under `packages/backend-common/controllers/*`, run `npm run generate-api` and commit the regenerated files.

## Renderer typing contract

- The renderer uses the shared `CosmoApi` type from `contracts/contracts/api` via `apps/cosmo-web/src/globals.d.ts`.
- If you change the exported API shape, ensure the type updates flow through generation and the renderer compiles.

## Logging

- Use `electron-log/renderer` (preload runs in a renderer-like context).
- Never log secrets or raw API keys.

## Testing expectations (preload)

- Add tests that assert:
    - `contextBridge.exposeInMainWorld('api', ...)` exports the expected shape.
    - No forbidden modules are exposed.
    - API surface changes are reflected in the renderer types.
