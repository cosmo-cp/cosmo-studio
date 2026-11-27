# `packages/` (workspace packages) — AGENTS override

This file applies to changes under `packages/`.

## Packages in this repo

- `packages/core` (package name: `core`) is the shared domain + data layer:
    - DTOs: `packages/core/dto.ts`
    - DB manager + migrations runner: `packages/core/database/*`
    - Drizzle schema: `packages/core/database/schema/*`
    - Repositories: `packages/core/repositories/*`
    - Services: `packages/core/services/*`
    - Platform SPI interfaces & default implementations: `packages/core/platform/*`
    - DI container: `packages/core/inversify.config.ts`
- `packages/contracts` (package name: `contracts`) holds generated shared IPC/HTTP contracts, browser-safe HTTP clients (`packages/contracts/http-api/*`), Electron IPC client wrappers (`packages/contracts/api/*`), and the browser API barrel (`packages/contracts/api.ts`). Do not add Electron/Node imports here.
- `packages/backend-common` (package name: `backend-common`) holds shared runtime controllers (`packages/backend-common/controllers/*`), IPC decorators (`packages/backend-common/ipc/Decorators.ts`), feature flags (`packages/backend-common/flags/*`), and runtime-shared services (`packages/backend-common/services/*`) used by both `apps/cosmo-desktop` and `apps/cosmo-http`. Do not import `electron-log/main` or Electron runtime modules directly into HTTP-shared services.
- `packages/guardrails` (package name: `guardrails`) is the security and safety guardrails engine (prompt injection, prompt leakage, PII redaction, secret scanning).

## What belongs in `core`

- Business/domain logic that is shared across Electron, HTTP, and renderer packages.
- Database schema and data access logic (repositories).
- Provider/model registry and AI provider configuration (as long as secrets stay out of the renderer).
- DTOs and types shared across process boundaries.

## Dependency and boundary rules

- Keep `core` as environment-agnostic as practical:
    - Never import from `apps/cosmo-desktop`, `apps/cosmo-http`, `apps/cosmo-web`, or `packages/backend-common`.
    - Prefer interfaces + DI over hard dependencies on Electron or cloud services.
- `core` must not import Electron, `safeStorage`, or `apps/cosmo-desktop/src/logger`.
- Platform concerns belong behind injectable adapters/SPIs:
    - `SecretStore` for provider/web-search key encryption.
    - `CoreLogger` for runtime-independent logging.
    - `ComputeRuntimeDriver`, `LicenseService`, `TelemetryEmitter`, and `AuthContext` under `packages/core/platform/`.
- Electron and HTTP provide their own bindings, so do not assume encrypted DB rows can move between runtime data directories.

## Database rules

- Schema changes must be accompanied by:
    - `npm run db:generate` (new migration files under `migrations/core/`)
    - `npm run db:check` and/or `npm run db:migrate` validation
- All upstream core tables carry nullable `organizationId` and `userId` columns (`TenantAuditFields`), omitted from client input DTOs.
- Keep schema naming consistent:
    - Tables are PascalCase (`Chat`, `Message`, `ModelProvider`, `Model`, `Persona`)
    - Prefer explicit relations (Drizzle `relations(...)`) for query ergonomics.
    - Avoid global `.unique()` on user/org-scoped entities; use composite `unique('...').on(table.organizationId, table.<col>).nullsNotDistinct()`.

## DTO/type export rules

- DTOs should remain serializable across IPC boundaries.
- When renderer only needs types, encourage `import type` to avoid bundling runtime code.

## Testing expectations (core)

- Repositories/services must have unit tests that cover:
    - Happy path results.
    - Edge cases (empty results, invalid ids).
    - Error paths (DB failures, encryption failures, fetch failures).
- For DB tests, prefer isolated test databases (ephemeral folder or in-memory if supported) and deterministic migrations (`migrations/core/`).
