# Dependencies reference

This document maps `package.json` dependencies to their official documentation (or the canonical README when official docs don’t exist).

## Root workspace (`package.json`)

### Runtime dependencies

| Package                     | Used for                                          | Docs                                                    |
| --------------------------- | ------------------------------------------------- | ------------------------------------------------------- |
| `electron-log`              | Main/renderer logging                             | https://github.com/megahertz/electron-log#readme        |
| `update-electron-app`       | Auto-updates (Electron Public Update Service)     | https://github.com/electron/update-electron-app#readme  |
| `electron-squirrel-startup` | Windows Squirrel startup handling                 | https://www.npmjs.com/package/electron-squirrel-startup |
| `dotenv`                    | Loading environment variables in main             | https://github.com/motdotla/dotenv#readme               |
| `reflect-metadata`          | Decorators + metadata (DI + IPC decorators)       | https://rbuckton.github.io/reflect-metadata/            |
| `inversify`                 | Dependency injection container                    | https://inversify.io/                                   |
| `zod`                       | Runtime validation (especially at IPC boundaries) | https://zod.dev/                                        |
| `@nestjs/common` | NestJS decorators/controllers for the HTTP runtime | https://docs.nestjs.com/ |
| `@nestjs/core` | NestJS application bootstrap for the HTTP runtime | https://docs.nestjs.com/ |
| `@nestjs/platform-express` | Express platform adapter for NestJS | https://docs.nestjs.com/ |
| `@nestjs/serve-static` | Serving the static renderer from the HTTP runtime | https://www.nestjs.com/packages/nestjs-serve-static |
| `rxjs` | NestJS runtime peer dependency | https://rxjs.dev/ |
| `superjson` | HTTP RPC payload codec for `Date` and structured values | https://github.com/flightcontrolhq/superjson#readme |
| `@types/express` | Express response/request types for Nest controllers | https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/express |
| `drizzle-orm`               | ORM for the embedded database                     | https://orm.drizzle.team/docs/overview                  |
| `drizzle-zod`               | Zod schemas from Drizzle schema                   | https://orm.drizzle.team/docs/zod                       |
| `@electric-sql/pglite`      | Embedded Postgres (PGlite) runtime                | https://pglite.dev/                                     |
| `ai`                        | Vercel AI SDK (streaming, message types)          | https://sdk.vercel.ai/docs                              |
| `@ai-sdk/anthropic`         | Anthropic provider for AI SDK                     | https://sdk.vercel.ai/providers/anthropic               |
| `@ai-sdk/openai`            | OpenAI provider for AI SDK                        | https://sdk.vercel.ai/providers/openai                  |
| `@ai-sdk/google`            | Google provider for AI SDK                        | https://sdk.vercel.ai/providers/google                  |
| `@ai-sdk/provider`          | Provider interfaces/types                         | https://sdk.vercel.ai/docs/ai-sdk-core/providers        |
| `@mcpc-tech/acp-ai-provider` | ACP agents as AI SDK language models              | https://ai-sdk.dev/providers/community-providers/acp    |
| `ollama-ai-provider-v2`     | Ollama provider (community)                       | https://www.npmjs.com/package/ollama-ai-provider-v2     |
| `@stepperize/react`         | Stepper UI helper (if/when used)                  | https://www.npmjs.com/package/@stepperize/react         |

### Dev dependencies (tooling/build)

| Package                                      | Used for                          | Docs                                                                  |
| -------------------------------------------- | --------------------------------- | --------------------------------------------------------------------- |
| `electron`                                   | Electron runtime                  | https://www.electronjs.org/docs/latest                                |
| `@electron-forge/cli`                        | Electron Forge CLI                | https://www.electronforge.io/                                         |
| `@electron-forge/plugin-vite`                | Build main/preload via Vite       | https://www.electronforge.io/config/plugins/vite                      |
| `@electron-forge/plugin-fuses`               | Configure Electron fuses          | https://www.electronforge.io/config/plugins/fuses                     |
| `@electron-forge/plugin-auto-unpack-natives` | Unpack native deps                | https://www.electronforge.io/config/plugins/auto-unpack-natives       |
| `@electron-forge/publisher-github`           | GitHub releases publishing        | https://www.electronforge.io/config/publishers/github                 |
| `@electron-forge/maker-zip`                  | macOS zip packaging               | https://www.electronforge.io/config/makers/zip                        |
| `@electron-forge/maker-squirrel`             | Windows Squirrel packaging        | https://www.electronforge.io/config/makers/squirrel.windows           |
| `@electron-forge/maker-deb`                  | Linux deb packaging               | https://www.electronforge.io/config/makers/deb                        |
| `@electron-forge/maker-rpm`                  | Linux rpm packaging               | https://www.electronforge.io/config/makers/rpm                        |
| `@electron/fuses`                            | Electron fuse flags               | https://www.electronjs.org/docs/latest/tutorial/fuses                 |
| `vite`                                       | Bundler for main/preload          | https://vite.dev/guide/                                               |
| `vite-tsconfig-paths`                        | TS path alias support in Vite     | https://github.com/aleclarson/vite-tsconfig-paths#readme              |
| `typescript`                                 | TypeScript compiler               | https://www.typescriptlang.org/docs/                                  |
| `ts-node`                                    | Running TS scripts (generate-api) | https://typestrong.org/ts-node/docs/                                  |
| `tsconfig-paths`                             | TS runtime path resolution        | https://github.com/dividab/tsconfig-paths#readme                      |
| `concurrently`                               | Run multiple dev processes        | https://github.com/open-cli-tools/concurrently#readme                 |
| `cross-env`                                  | Cross-platform env vars           | https://github.com/kentcdodds/cross-env#readme                        |
| `drizzle-kit`                                | Schema → migrations CLI           | https://orm.drizzle.team/kit-docs/overview                            |
| `gts`                                        | Google TS style (lint/fix)        | https://github.com/google/gts#readme                                  |
| `@typescript-eslint/parser`                  | ESLint TS parser                  | https://typescript-eslint.io/                                         |
| `@typescript-eslint/eslint-plugin`           | ESLint rules for TS               | https://typescript-eslint.io/                                         |
| `eslint-plugin-import`                       | Import lint rules                 | https://github.com/import-js/eslint-plugin-import#readme              |
| `eslint-import-resolver-typescript`          | TS import resolution for ESLint   | https://github.com/import-js/eslint-import-resolver-typescript#readme |

## Renderer (`src/renderer/package.json`)

### Runtime dependencies

| Package                    | Used for                                     | Docs                                                                        |
| -------------------------- | -------------------------------------------- | --------------------------------------------------------------------------- |
| `next`                     | Next.js App Router                           | https://nextjs.org/docs                                                     |
| `react` / `react-dom`      | UI runtime                                   | https://react.dev/                                                          |
| `@reduxjs/toolkit` | Renderer-wide state management and async thunks | https://redux-toolkit.js.org/ |
| `react-redux` | React bindings for Redux state | https://react-redux.js.org/ |
| `next-themes`              | Theme switching                              | https://github.com/pacocoursey/next-themes#readme                           |
| `tailwindcss`              | Styling                                      | https://tailwindcss.com/docs                                                |
| `@tailwindcss/postcss`     | Tailwind PostCSS integration                 | https://tailwindcss.com/docs/installation/using-postcss                     |
| `postcss`                  | CSS pipeline                                 | https://postcss.org/                                                        |
| `clsx`                     | ClassName composition                        | https://github.com/lukeed/clsx#readme                                       |
| `classnames`               | ClassName composition                        | https://github.com/JedWatson/classnames#readme                              |
| `tailwind-merge`           | Merge Tailwind class strings                 | https://github.com/dcastil/tailwind-merge#readme                            |
| `class-variance-authority` | Variant class patterns (shadcn)              | https://cva.style/docs                                                      |
| `lucide-react`             | Icons                                        | https://lucide.dev/guide/packages/lucide-react                              |
| `sonner`                   | Toast notifications                          | https://sonner.emilkowal.ski/                                               |
| `swr`                      | Client data fetching + caching               | https://swr.vercel.app/docs/getting-started                                 |
| `ai`                       | Vercel AI SDK shared types                   | https://sdk.vercel.ai/docs                                                  |
| `@ai-sdk/react`            | AI SDK React hooks                           | https://sdk.vercel.ai/docs/ai-sdk-ui/react                                  |
| `react-markdown`           | Markdown rendering                           | https://github.com/remarkjs/react-markdown#readme                           |
| `remark-gfm`               | GitHub-flavored Markdown                     | https://github.com/remarkjs/remark-gfm#readme                               |
| `shiki`                    | Code highlighting                            | https://shiki.style/guide/                                                  |
| `react-syntax-highlighter` | Code highlighting (fallback)                 | https://github.com/react-syntax-highlighter/react-syntax-highlighter#readme |
| `date-fns`                 | Date utilities                               | https://date-fns.org/docs/Getting-Started                                   |
| `nanoid`                   | ID generation                                | https://github.com/ai/nanoid#readme                                         |
| `cmdk`                     | Command palette UI                           | https://cmdk.paco.me/                                                       |
| `framer-motion` / `motion` | Animations                                   | https://www.framer.com/motion/                                              |
| `embla-carousel-react`     | Carousel UI                                  | https://www.embla-carousel.com/get-started/react/                           |
| `@xyflow/react`            | Flow/graph UI                                | https://reactflow.dev/                                                      |
| `react-mentions`           | @mention UI                                  | https://github.com/signavio/react-mentions#readme                           |
| `usehooks-ts`              | React hooks utilities                        | https://usehooks-ts.com/                                                    |
| `use-stick-to-bottom`      | “Stick to bottom” scrolling helper           | https://www.npmjs.com/package/use-stick-to-bottom                           |
| `streamdown`               | Streaming markdown utilities (if used)       | https://www.npmjs.com/package/streamdown                                    |
| `tokenlens`                | Token counting/analysis (if used)            | https://www.npmjs.com/package/tokenlens                                     |
| `geist`                    | Geist font/package                           | https://geist.vercel.app/                                                   |
| `core`                     | Local workspace package (DTOs, shared types) | `packages/core/`                                                            |

#### Radix UI primitives (used via shadcn/ui)

| Package                                  | Docs                                                                      |
| ---------------------------------------- | ------------------------------------------------------------------------- |
| `@radix-ui/react-accordion`              | https://www.radix-ui.com/primitives/docs/components/accordion             |
| `@radix-ui/react-alert-dialog`           | https://www.radix-ui.com/primitives/docs/components/alert-dialog          |
| `@radix-ui/react-avatar`                 | https://www.radix-ui.com/primitives/docs/components/avatar                |
| `@radix-ui/react-collapsible`            | https://www.radix-ui.com/primitives/docs/components/collapsible           |
| `@radix-ui/react-dialog`                 | https://www.radix-ui.com/primitives/docs/components/dialog                |
| `@radix-ui/react-dropdown-menu`          | https://www.radix-ui.com/primitives/docs/components/dropdown-menu         |
| `@radix-ui/react-hover-card`             | https://www.radix-ui.com/primitives/docs/components/hover-card            |
| `@radix-ui/react-progress`               | https://www.radix-ui.com/primitives/docs/components/progress              |
| `@radix-ui/react-scroll-area`            | https://www.radix-ui.com/primitives/docs/components/scroll-area           |
| `@radix-ui/react-select`                 | https://www.radix-ui.com/primitives/docs/components/select                |
| `@radix-ui/react-separator`              | https://www.radix-ui.com/primitives/docs/components/separator             |
| `@radix-ui/react-slot`                   | https://www.radix-ui.com/primitives/docs/utilities/slot                   |
| `@radix-ui/react-tooltip`                | https://www.radix-ui.com/primitives/docs/components/tooltip               |
| `@radix-ui/react-use-controllable-state` | https://www.radix-ui.com/primitives/docs/utilities/use-controllable-state |

### Dev dependencies

| Package              | Used for                           | Docs                                                                     |
| -------------------- | ---------------------------------- | ------------------------------------------------------------------------ |
| `eslint`             | Linting                            | https://eslint.org/docs/latest/                                          |
| `eslint-config-next` | Next.js lint rules                 | https://nextjs.org/docs/app/building-your-application/configuring/eslint |
| `@eslint/eslintrc`   | ESLint config helpers              | https://eslint.org/docs/latest/use/configure                             |
| `typescript`         | TS compiler                        | https://www.typescriptlang.org/docs/                                     |
| `tw-animate-css`     | Tailwind animation helpers         | https://www.npmjs.com/package/tw-animate-css                             |
| `@types/*`           | Type definitions (DefinitelyTyped) | https://github.com/DefinitelyTyped/DefinitelyTyped                       |
