# `scripts/` (repo tooling) — AGENTS override

This file applies to changes under `scripts/`.

## Purpose

Scripts are developer tools run from the repo root (usually via `npm run ...`).

Current scripts:

- `scripts/generate-api.ts` — regenerates the generated contracts (`packages/contracts/api.ts`, `packages/contracts/contracts/*`, `packages/contracts/api/*`, `packages/contracts/http-api/*`), Electron preload barrel (`apps/cosmo-desktop/preload/rpc-api.ts`), and HTTP RPC manifest (`apps/cosmo-http/src/rpc-manifest.ts`) from IPC controller decorators in `packages/backend-common/controllers/*`.

## Rules for scripts

- Scripts must be deterministic and idempotent:
    - Same inputs → same output file contents.
    - Do not depend on network availability unless explicitly documented and mocked for tests.
- Prefer small, focused scripts that do one job well.
- Never write outside the repo root unless explicitly requested.
- If a script generates code, the generated output should be checked into git and treated as a build artifact with a single source of truth (the generator).

## Updating IPC generation

When adding/changing IPC controllers:

- Update controllers and decorators first (`packages/backend-common/controllers/*`).
- Run `npm run generate-api`.
- If generation fails or produces incorrect imports/types, fix `scripts/generate-api.ts` / `scripts/generate-api-lib.ts` rather than hand-editing the generated files.
- Keep unit tests in `scripts/generate-api-lib.test.ts` updated alongside generator changes.
