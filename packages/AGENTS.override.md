# `packages/` (workspace packages) — AGENTS override

This file applies to changes under `packages/`.

## Packages in this repo

- `packages/core` (package name: `core`) is the shared domain + data layer:
  - DTOs: `packages/core/dto.ts`
  - DB manager + migrations runner: `packages/core/database/*`
  - Drizzle schema: `packages/core/database/schema/*`
  - Repositories: `packages/core/repositories/*`
  - Services: `packages/core/services/*`
  - Platform interfaces: `packages/core/platform/*`
  - DI container: `packages/core/inversify.config.ts`

## What belongs in `core`

- Business/domain logic that is shared across main/preload/renderer.
- Database schema and data access logic (repositories).
- Provider/model registry and AI provider configuration (as long as secrets stay out of the renderer).
- DTOs and types shared across process boundaries.

## Dependency and boundary rules

- Keep `core` as environment-agnostic as practical:
  - Prefer not importing from `src/main` or `src/renderer`.
  - Prefer interfaces + DI over hard dependencies on Electron.
- `core` must not import Electron, `safeStorage`, or `src/main/logger`.
- Platform concerns belong behind injectable adapters:
  - `SecretStore` for provider/web-search key encryption.
  - `CoreLogger` for runtime-independent logging.
- Electron and HTTP provide their own bindings, so do not assume encrypted DB rows can move between runtime data directories.

## Database rules

- Schema changes must be accompanied by:
  - `npm run db:generate` (new migration files under `migrations/`)
  - `npm run db:check` and/or `npm run db:migrate` validation
- Keep schema naming consistent:
  - Tables are PascalCase (`Chat`, `Message`, `ModelProvider`, `Model`, `Persona`)
  - Prefer explicit relations (Drizzle `relations(...)`) for query ergonomics.

## DTO/type export rules

- DTOs should remain serializable across IPC boundaries.
- When renderer only needs types, encourage `import type` to avoid bundling runtime code.

## Testing expectations (core)

- Repositories/services must have unit tests that cover:
  - Happy path results.
  - Edge cases (empty results, invalid ids).
  - Error paths (DB failures, encryption failures, fetch failures).
- For DB tests, prefer isolated test databases (ephemeral folder or in-memory if supported) and deterministic migrations.
