# `src/renderer` (Next.js renderer/UI) — AGENTS override

This file applies to changes under `src/renderer/`.

## Runtime constraints (important)

- The renderer is a Next.js App Router project under `src/renderer/src/`.
- `src/renderer/next.config.ts` uses `output: "export"`:
    - Production builds are **static** and written to `src/renderer/out/`.
    - Do not rely on server-only features (API routes, server actions, runtime secrets).
- In Electron dev, the UI is served by `next dev` on `http://localhost:3000` and loaded by `src/main/index.ts`.
- In HTTP dev, the UI is served by `next dev` on `http://localhost:3000` and talks to Nest on `http://127.0.0.1:4000/api`.
- `NEXT_PUBLIC_COSMO_BACKEND=electron|http` selects the runtime adapter at build/dev time.
- `NEXT_PUBLIC_COSMO_API_BASE` defaults to `/api` for HTTP builds.

## Development constraints (important)

- The files under the folders `src/renderer/src/components/ui` and `src/renderer/src/components/ai-elements` should never be changed. These files are downloaded using npm. If the files are changed then at the next version upgrade for these files will either have conflict or override content.

## Process boundary rules

- Renderer must not import Node/Electron APIs.
- All privileged operations go through preload-backed capabilities.
- Renderer components should not call `window.api` directly:
    - Use the bounded Zustand store, feature backend hooks, and UI slices for shared renderer state and cached request/response flows.
    - Keep backend resolution isolated to `src/renderer/src/lib/store/app-data-source.ts`, feature SWR-backed modules under `src/renderer/src/features/*/*-api.ts`, and streaming transport code such as `src/renderer/src/chat-transport.ts`.
- Renderer components should not branch on Electron versus HTTP:
    - Request/response backend selection belongs in `src/renderer/src/lib/store/app-data-source.ts` and is consumed by `useBackendQuery()` / `useBackendMutation()` through the shared store context.
    - Streaming backend selection belongs in `src/renderer/src/chat-transport.ts`.
    - Browser-safe HTTP RPC calls live in `src/preload/api.ts`; Electron-only preload calls live behind `window.api` via `src/preload/rpc-api.ts`.
- Prefer `import type` when consuming `core/dto` types to avoid bundling heavy runtime code:
    - Example: `import type {Chat} from "core/dto";`

## UI stack (what to use)

- Styling: Tailwind CSS v4 + CSS variables in `src/renderer/src/app/globals.css`.
- Component primitives: shadcn/ui + Radix (`src/renderer/src/components/ui/*`).
- Icons: `lucide-react`.
- Themes: `next-themes` (`ThemeProvider` in `src/renderer/src/app/providers.tsx`).
- App provider stack: `src/renderer/src/app/providers.tsx` composes `StoreProvider`, `ThemeProvider`, and `UiFeedbackHost`.
- Notifications: `sonner`.

## Design guidelines (match current product)

The current UI establishes:

- Left app sidebar (logo + primary nav + Settings).
- A top header with utility actions (GitHub CTA, theme toggle).
- Neutral palette, soft borders, rounded corners, card layouts.

When adding UI:

- Default to semantic tokens (`bg-background`, `text-foreground`, `border-border`) instead of hardcoded colors.
- Keep spacing consistent (use existing patterns like `p-4`, `gap-2/4/6`, `rounded-lg`).
- Prefer composition over custom one-off styling; reuse `src/renderer/src/components/ui/*`.
- Mobile-first:
    - Ensure no overflow; use `min-h-0` and `overflow-hidden` patterns used in `src/renderer/src/app/(main)/layout.tsx`.
    - Validate sidebar behavior at small sizes.

## Accessibility (required)

- Ensure every interactive element is keyboard reachable.
- Provide labels for icon-only buttons (`aria-label` or `sr-only` text).
- Preserve visible focus states (don’t remove outlines).
- Don’t rely on color alone for state.
- Be careful with Markdown rendering; never allow unsafe HTML injection.

## Performance rules (follow Vercel best practices)

This repo includes the Vercel React/Next best-practices skill in `.codex/skills/vercel-react-best-practices/`.
Apply the highest-impact rules first:

- Avoid waterfalls: start async work early; `Promise.all()` independent work.
- Bundle size: avoid barrel imports; dynamically import heavy components where appropriate.
- Re-render control: memoize expensive components; keep effect deps narrow; avoid derived state pitfalls.
- Client fetching: use `swr` for dedup/caching when data is fetch-like and can be cached.

## Data flow conventions

- Prefer a single renderer-wide Zustand store as the source of truth for shared UI state.
- Keep backend request/response side effects in feature backend hooks or adapter modules, not in store slices or presentation components.
- Keep renderer logic focused on presentation + orchestration:
    - DB queries, encryption, provider registries belong in `packages/core` and/or main controllers.
- Resolve backend-specific request/response access through `src/renderer/src/lib/store/app-data-source.ts`, `src/renderer/src/lib/store/backend-hooks.ts`, and colocated feature modules such as `src/renderer/src/features/chat/chat-api.ts`, `src/renderer/src/features/providers/providers-api.ts`, and `src/renderer/src/features/mcp-servers/mcp-servers-api.ts`.
- Keep page-level orchestration in `src/renderer/src/features/*/use-*-page-state.ts` hooks so large components stay mostly presentational.
- Keep backend error handling and cache updates centralized in `src/renderer/src/lib/store/backend-hooks.ts`; keep toast presentation in `src/renderer/src/lib/store/ui-feedback-store.ts` and `src/renderer/src/components/ui-feedback-host.tsx`.
- Keep Zustand slices renderer-only:
    - `src/renderer/src/features/chat/chat-store.ts` owns page-local chat selection and search state.
    - `src/renderer/src/features/web-search/web-search-store.ts` owns the frontend-only Parallel web-search session config.
- For streaming chat:
    - Renderer uses `@ai-sdk/react` and `createChatTransport()` (`src/renderer/src/chat-transport.ts`).
    - Electron builds use `IpcChatTransport`; ensure stream channels are stable (`chat-stream-${chatId}`) and all listeners are cleaned up.
    - HTTP builds use AI SDK `DefaultChatTransport` against `POST /api/chat`.

## Testing expectations (renderer)

Add tests for any new UI behavior:

- Unit/component tests for components (React Testing Library + a JS test runner).
- Interaction tests for critical flows (chat send/stream, provider management, settings navigation).
- E2E automation: Playwright Electron mode should cover “happy path” and at least one failure path.

If a test harness is missing, add it as part of the change rather than skipping tests.

## Ignore Test

Very Important, do not add any test for files in the following folders

- `src/components/ai-elements`
- `src/components/ui`

## How to add a new page + sidebar entry

Cosmo Studio uses the Next.js App Router. The main application shell (sidebar + header) is defined by the `(main)` route group layout.

### 1) Create an empty page

Create a new folder under `src/renderer/src/app/(main)/` and add a `page.tsx`.

Example: add a page at `/about`

- Create file: `src/renderer/src/app/(main)/about/page.tsx`
- Minimal client component template:

```tsx
'use client';

export default function AboutPage() {
    return (
        <div className="flex h-full w-full flex-col p-4">
            <h1 className="text-2xl font-semibold">About</h1>
        </div>
    );
}
```

If the page doesn’t need hooks/state, you can omit `'use client'` and make it a server component (but remember this app is statically exported in production, so avoid server-only features).

### 2) Add it to the sidebar

Update the sidebar menu items in `src/renderer/src/components/app-sidebar.tsx`:

- Import an icon from `lucide-react` (or reuse an existing one).
- Add a new item to `menuItems`:

```ts
{
  title: "About",
  url: "./about",
  icon: Info,
}
```

Keep URLs consistent with existing entries (`"./"`, `"./persona"`, `"./settings"`). The `Link` rendering is already handled by the sidebar component.

### 3) Quick verification

- Start dev: `npm run dev` (from repo root).
- Click the new sidebar item and confirm:
    - route renders inside the main shell
    - keyboard navigation works
    - layout doesn’t overflow (small window widths)
