# Testing strategy

The quality bar is “no untested behavior”. New code should ship with unit + integration coverage, and critical flows should be protected by E2E automation.

## Coverage goals

- 100%+ coverage mindset for new/changed code (line + branch).
- Every error path should be asserted (including validation failures).

## What to test

### `packages/core`

- Unit test repositories and services:
    - DB queries return correct shapes.
    - Edge cases (empty, missing id).
    - Error handling.
- Prefer isolated DB instances per test suite:
    - Use ephemeral directories and run migrations deterministically.
    - Add unit coverage for command parsing/template rendering.

### `src/main`

- Integration test IPC controllers:
    - Validation behavior at the boundary.
    - Calls into core services via DI.
- Streaming controllers emit `*-data`, `*-end`, `*-error` consistently.
    - Command controller validates input and delegates to core services.

### `src/preload`

- Test the exposed `window.api` surface:
    - Correct function names and grouping.
    - No forbidden modules exposed.
    - Generated output stays in sync with controllers.

### `src/renderer`

- Component tests for UI behavior:
    - Chat selection, message rendering, search highlighting, model/persona selection.
    - Command management screens and dropdown integration.
- Mock `window.api` for unit tests; do not require Electron runtime.

## Automation / E2E

Use Playwright in Electron mode to cover:

- App boots to splash → main UI.
- Create chat → send message → stream response → persisted history.
- Provider management (add/edit/delete provider).
- Settings navigation + theme toggle.

E2E tests should run in CI and be resilient:

- Avoid timing flakiness by waiting on visible UI states and deterministic test data.
- Prefer seeding DB or using a test-only DB directory per run.
