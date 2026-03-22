# Database

Cosmo Studio uses Drizzle ORM with PGlite (embedded Postgres) and runs migrations automatically on startup.

## Files and folders

- Drizzle schema:
    - `packages/core/database/schema/chatSchema.ts`
    - `packages/core/database/schema/modelProviderSchema.ts`
    - `packages/core/database/schema/personaSchema.ts`
    - Re-exported from `packages/core/database/schema/schema.ts`
- Drizzle config: `drizzle.config.ts`
- Generated migrations: `migrations/`
- Runtime migrator: `packages/core/database/migrator.ts`
- DB initialization: `packages/core/database/DatabaseManager.ts` called from `src/main/index.ts`

## Tables (current)

- `Chat`, `Message`
- `ModelProvider`, `Model`
- `Persona`

## Local storage location

At runtime, the database directory is under Electron’s user data folder:

- `app.getPath('userData')/<dbFolderName>`
    - Dev uses `process.env.DATABASE_NAME` (required).
    - Prod uses `database`.

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

During bundling, `vite.main.config.ts` copies the `migrations/` directory into `.vite/build/migrations`.
At runtime, `packages/core/database/migrator.ts` looks for migrations relative to the compiled output.

## API key encryption (ModelProvider)

Provider API keys are stored encrypted at rest:

- Encryption uses Electron `safeStorage` when available.
- Fallback is base64 encoding when encryption is unavailable (dev machines without support).
- Keep keys out of logs and out of IPC responses.
