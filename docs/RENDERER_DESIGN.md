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
- Renderer-wide shared state lives in a single Redux Toolkit store at the app root.
- Async renderer data flows should use Redux thunks that resolve the shared store-backed API source.
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
    - Keep chat history, selected chat, and conversation search state in the root Redux store so sibling panels and settings screens share one source of truth.
- Settings/stateful resources:
    - Commands, personas, providers, and MCP servers should load through Redux thunks instead of calling preload APIs directly from components.
- Backend adapters:
    - Request/response flows go through `src/renderer/src/lib/store/store.ts`.
    - HTTP RPC calls go through `src/preload/api.ts`.
    - Presentation components should not branch on Electron versus HTTP.
- Commands:
    - List commands dynamically (built-ins + custom).
    - Allow optional single-argument input and show hints in the UI.
- Errors:
    - Use `sonner` for user-facing errors; use `logger` for diagnostic logs.

## Streaming transport

- Chat UI uses `createChatTransport()` from `src/renderer/src/chat-transport.ts`.
- Electron builds use the IPC-backed transport and preload listener cleanup.
- HTTP builds use AI SDK `DefaultChatTransport` against `POST /api/chat`.
- Keep model/persona metadata in the transport request metadata, not component-specific backend branches.
