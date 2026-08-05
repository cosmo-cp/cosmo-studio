# Database

Cosmo Studio uses Drizzle ORM with PGlite (embedded Postgres) and runs migrations automatically on startup for both Electron and HTTP runtimes.

## Files and folders

- Drizzle schema:
    - `packages/core/database/schema/chatSchema.ts`
    - `packages/core/database/schema/modelProviderSchema.ts`
    - `packages/core/database/schema/personaSchema.ts`
    - Re-exported from `packages/core/database/schema/schema.ts`
- Drizzle config: `drizzle.config.ts`
- Generated migrations: `migrations/`
- Runtime migrator: `packages/core/database/migrator.ts`
- DB initialization: `packages/core/database/DatabaseManager.ts`
    - Electron: called from `src/main/index.ts`
    - HTTP: called from `src/main/http/index.ts`

## Tables (current)

- `Chat`, `Message`
- `ModelProvider`, `Model`
- `Persona`

## Local storage location

Electron runtime:

- `app.getPath('userData')/<dbFolderName>`
    - Dev uses `process.env.DATABASE_NAME` (required).
    - Prod uses `database`.

HTTP runtime:

- `COSMO_HTTP_DATA_DIR/database`
    - Defaults to `.cosmo-http/database` under the current working directory.
    - `COSMO_HTTP_DATA_DIR` is also used for the generated HTTP secret-store key when `COSMO_SECRET_KEY` is not set.

Electron and HTTP intentionally use separate default directories. Provider and web-search API keys are encrypted with runtime-specific secret stores, so encrypted rows should not be shared between the two DBs by default.

## Migrations workflow

When you change schema:

1. Update schema files under `packages/core/database/schema/`.
2. Generate migration files:
    - `npm run db:generate`
3. Validate/apply:
    - `npm run db:check`
    - `npm run db:migrate`
4. Commit the migration output under `migrations/`.

## Migrations in packaged builds

During Electron bundling, `vite.main.config.ts` copies the `migrations/` directory into `.vite/build/migrations`.

During HTTP bundling, `vite.http.config.ts` copies the `migrations/` directory into `.vite/http/migrations`.

At runtime, `packages/core/database/migrator.ts` looks for migrations relative to the compiled output.

## API key encryption (ModelProvider)

Provider and web-search API keys are stored encrypted at rest through the injected `SecretStore` interface:

- Electron binds `SecretStore` to Electron `safeStorage` when available.
- HTTP binds `SecretStore` to a Node AES-GCM store using `COSMO_SECRET_KEY` or `COSMO_HTTP_DATA_DIR/secret.key`.
- The core package also has a base64 fallback binding for tests and non-runtime construction.
- Keep keys out of logs and out of IPC responses.
