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
    - Render chat messages/status from Redux, not component-local `useChat` state.
    - Keep AI SDK `Chat` runtimes outside React component lifecycle so route changes do not drop active streams.
- Commands:
    - List commands dynamically (built-ins + custom).
    - Allow optional single-argument input and show hints in the UI.
- Errors:
    - Use the centralized chat thunk/middleware path for chat IPC logging and toasts.
    - Use `sonner` for user-facing errors; use `logger` for diagnostic logs.
