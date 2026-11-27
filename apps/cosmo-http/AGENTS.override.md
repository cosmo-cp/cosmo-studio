# `apps/cosmo-http` (HTTP service runtime) — AGENTS override

This file applies to changes under `apps/cosmo-http/`.

## Responsibilities (what belongs here)

- NestJS HTTP bootstrap, host/port env configuration, static renderer serving, DB initialization, and MCP client initialization (`apps/cosmo-http/src/index.ts`, `apps/cosmo-http/src/AppModule.ts`).
- Generated HTTP RPC dispatch (`apps/cosmo-http/src/RpcController.ts` and generated `apps/cosmo-http/src/rpc-manifest.ts`).
- HTTP chat streaming delivery adapter (`apps/cosmo-http/src/ChatHttpController.ts`) backed by `ChatStreamingService` (`packages/backend-common/services/ChatStreamingService.ts`).
- HTTP runtime adapters (e.g., `HttpSecretStore`, `HttpFolderPickerService`).
- Enterprise extension wiring via `@ee/enterprise-modules` (`apps/cosmo-http/src/ee-stub/enterprise-modules.ts` in OSS builds; enterprise Nest modules in private overlays).

## HTTP runtime conventions

- `apps/cosmo-http/src/RpcController.ts` must keep the RPC envelope stable:
    - `{ok: true, result}`
    - `{ok: false, error: {code, message}}`
- HTTP RPC does not pass an Electron event. Do not put HTTP-reused handler logic in `packages/backend-common/controllers/*` behind required Electron event parameters.
- Keep HTTP v1 local single-user by default: bind `COSMO_HTTP_HOST=127.0.0.1` unless explicitly configured otherwise.
- Do not hand-edit generated `apps/cosmo-http/src/rpc-manifest.ts`; regenerate with `npm run generate-api`.

## Database + migrations (runtime facts)

- HTTP DB lives under `COSMO_HTTP_DATA_DIR/database`, defaulting to `.cosmo-http/database`.
- `vite.http.config.mts` copies `migrations/` (including `migrations/core/`) into `.vite/http/migrations` for the built HTTP service, and static web assets to `.vite/http/public`.
