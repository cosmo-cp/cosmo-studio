# Renderer design system

This document captures UI/UX conventions so new features match the existing Cosmo Studio product.

## Visual structure (current)

- Primary left app sidebar:
    - Branding (Cosmo icon + “Cosmo Studio” text)
    - Primary navigation (Chat, Persona)
    - Footer Settings entry
- Top header:
    - Sidebar toggle
    - GitHub CTA button (“Give us a Star on Github”)
    - Theme toggle
- Main “Chat” view:
    - Chat history column with search + list
    - Conversation area with message list and fixed composer
- Settings:
    - Left rail of settings sections
    - Right content card for selected setting
    - Commands section for managing built-in and custom commands

## Stack

- Tailwind CSS v4, tokens defined in `src/renderer/src/app/globals.css` (neutral base, light/dark).
- shadcn/ui component primitives + Radix for accessibility.
- Icons via `lucide-react`.
- Theme switching via `next-themes`.
- Renderer-wide shared state lives in a single bounded Zustand store at the app root.
- `src/renderer/src/app/providers.tsx` composes `StoreProvider`, `ThemeProvider`, and `UiFeedbackHost` so backend-driven toasts render once for the whole app shell.
- Async renderer request/response flows should use feature SWR-backed hook modules under `src/renderer/src/features/*/*-api.ts`, all built on `src/renderer/src/lib/store/backend-hooks.ts`.
- Complex pages should keep orchestration in `src/renderer/src/features/*/use-*-page-state.ts` and keep components mostly presentational.
- UI-only renderer state should stay in focused slices such as `src/renderer/src/features/chat/chat-store.ts`, `src/renderer/src/features/web-search/web-search-store.ts`, and `src/renderer/src/lib/store/ui-feedback-store.ts`.
- Backend exception handling, cache updates, and mutation toast wiring should stay centralized in `src/renderer/src/lib/store/backend-hooks.ts`.
- User-facing backend toasts should be queued in `src/renderer/src/lib/store/ui-feedback-store.ts` and rendered by `src/renderer/src/components/ui-feedback-host.tsx`.
- Runtime backend selection is build/dev-time configuration:
    - `NEXT_PUBLIC_COSMO_BACKEND=electron` uses preload-backed `window.api`.
    - `NEXT_PUBLIC_COSMO_BACKEND=http` uses the browser-safe `httpApi` from `src/preload/api.ts`.
    - `NEXT_PUBLIC_COSMO_API_BASE` defaults to `/api` for HTTP builds.

## Guidelines

### Mobile-first

- Layout must work at small widths:
    - Sidebar should collapse/hide without breaking navigation.
    - Avoid horizontal overflow; use `min-h-0` + `overflow-hidden` where necessary.

### Accessibility

- Keyboard navigation for all controls (including icon-only buttons).
- Visible focus states.
- Avoid relying on color alone for meaning.
- Ensure light/dark contrast stays readable.

### Consistency

- Prefer semantic tokens (`bg-background`, `text-foreground`, `border-border`) over raw colors.
- Use established spacing/radius patterns (`rounded-lg`, `p-4`, `gap-2/4/6`).
- Prefer reusing UI primitives over custom components.

### UX interactions

- Streaming chat:
    - Always handle failure states (toast + recoverable UI).
    - Clean up IPC listeners when streams end/cancel.
- Chat page state:
    - Keep cached chat history/messages in feature SWR hooks.
    - Keep selected chat id, conversation search state, and renderer-only web-search selection in Zustand state so sibling panels share one source of truth.
- Settings/stateful resources:
    - Commands, personas, providers, MCP servers, ACP agents, workflows, and persisted web-search config should load through feature backend hooks instead of calling preload APIs directly from components.
    - Dialog/form orchestration should live in feature state hooks such as `use-provider-page-state.ts`, `use-command-management-state.ts`, or `use-web-search-page-state.ts`.
- Backend adapters:
    - Request/response flows go through `src/renderer/src/lib/store/app-data-source.ts`, `src/renderer/src/lib/store/backend-hooks.ts`, and feature modules such as `chat-api.ts` or `providers-api.ts`.
    - HTTP RPC calls go through `src/preload/api.ts`.
    - Presentation components should not branch on Electron versus HTTP.
- Commands:
    - List commands dynamically (built-ins + custom).
    - Allow optional single-argument input and show hints in the UI.
- Errors:
    - Keep backend logging in `backend-hooks.ts`.
    - Surface backend toasts through the UI feedback slice/host instead of calling `sonner` in each component.
    - Reserve component-level `sonner` calls for renderer-local validation and streaming errors.

## Streaming transport

- Chat UI uses `createChatTransport()` from `src/renderer/src/chat-transport.ts`.
- Electron builds use the IPC-backed transport and preload listener cleanup.
- HTTP builds use AI SDK `DefaultChatTransport` against `POST /api/chat`.
- Keep model/persona metadata in the transport request metadata, not component-specific backend branches.
