# `scripts/` (repo tooling) — AGENTS override

This file applies to changes under `scripts/`.

## Purpose

Scripts are developer tools run from the repo root (usually via `npm run ...`).

Current scripts:

- `scripts/generate-api.ts` — regenerates the generated preload API files under `src/preload/api.ts` and `src/preload/api/*` based on IPC controller decorators in `src/main/controllers/*`.

## Rules for scripts

- Scripts must be deterministic and idempotent:
    - Same inputs → same output file contents.
    - Do not depend on network availability unless explicitly documented and mocked for tests.
- Prefer small, focused scripts that do one job well.
- Never write outside the repo root unless explicitly requested.
- If a script generates code, the generated output should be checked into git and treated as a build artifact with a single source of truth (the generator).

## Updating IPC generation

When adding/changing IPC controllers:

- Update controllers and decorators first (`src/main/controllers/*`).
- Run `npm run generate-api`.
- If generation fails or produces incorrect imports/types, fix `scripts/generate-api.ts` rather than hand-editing the generated preload API files.
- No need to add test for `scripts/generate-api.ts`
