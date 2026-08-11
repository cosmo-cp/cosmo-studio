# Feature Reference

Cosmo Studio is a local-first AI chat and workflow application. It ships as an Electron desktop app and can also run as a local NestJS HTTP service using the same static Next.js renderer and shared core package.

Use this file as the quick feature index. For implementation details, follow the source references in each section.

## Chat Workspace

- Local chat history with create, select, delete, pin/unpin, last-message previews, and history search.
    - UI: `src/renderer/src/app/(main)/chat/page.tsx`, `src/renderer/src/components/chat-history.tsx`, `src/renderer/src/components/chat-header.tsx`
    - Renderer orchestration: `src/renderer/src/features/chat/use-chat-page-state.ts`
    - Data: `packages/core/database/schema/chatSchema.ts`, `packages/core/services/ChatService.ts`, `packages/core/services/MessageService.ts`
- Conversation search with match counts, next/previous navigation, `Ctrl+F`/`Cmd+F`, and inline highlights.
    - UI: `src/renderer/src/components/chat-header.tsx`, `src/renderer/src/components/messages.tsx`
- Streaming chat responses through AI SDK UI messages, with abort/stop support exposed by the composer.
    - Renderer transport: `src/renderer/src/chat-transport.ts`
    - Electron delivery: `src/main/controllers/StreamingChatController.ts`
    - HTTP delivery: `src/main/http/ChatHttpController.ts`
    - Shared stream assembly: `src/main/services/ChatStreamingService.ts`
- Rich message rendering with Markdown/GFM, assistant copy actions, reasoning panels, source links, file previews, tool call panels, and tool approval/denial responses.
    - UI: `src/renderer/src/components/messages.tsx`, `src/renderer/src/components/markdown.tsx`, `src/renderer/src/components/preview-attachment.tsx`, `src/renderer/src/components/ai-elements/tool.tsx`, `src/renderer/src/components/ai-elements/confirmation.tsx`
- Per-chat selected model, selected persona, selected runtime (`model` or `agent`), selected ACP agent, and renderer-side selected web-search option.
    - State: `src/renderer/src/features/chat/chat-store.ts`
    - Persisted chat selections: `packages/core/database/schema/chatSchema.ts`

## Model Providers And Models

- Provider management for OpenAI, Anthropic, Google, xAI, Groq, Mistral, DeepSeek, Ollama, Moonshot, Perplexity, Cohere, LM Studio, HuggingFace, and custom OpenAI-compatible endpoints.
    - Catalog: `packages/core/providerCatalog.ts`
    - Service: `packages/core/services/ModelProviderService.ts`
    - UI/orchestration: `src/renderer/src/components/provider-management.tsx`, `src/renderer/src/features/providers/use-provider-page-state.ts`
- Add, edit, delete, and list providers. Remote providers store API keys; local providers such as Ollama and LM Studio can run without API keys.
    - Schema: `packages/core/database/schema/modelProviderSchema.ts`
    - Secret storage boundary: `packages/core/platform/SecretStore.ts`, `src/main/platform/ElectronSecretStore.ts`
- Model discovery from `models.dev`, Ollama, and LM Studio, including capability metadata such as reasoning, tool calling, context/output windows, attachments, status, and input/output modalities.
    - Service: `packages/core/services/ModelProviderService.ts`
    - UI capability display: `src/renderer/src/components/provider-management.tsx`
- Composer model selector with provider grouping, search, automatic first-model selection, and attachment gating based on image input support.
    - UI: `src/renderer/src/components/multimodal-input.tsx`

## Personas

- Create, edit, delete, list, and select reusable personas.
    - UI: `src/renderer/src/components/persona-list.tsx`, `src/renderer/src/components/multimodal-input.tsx`
    - Renderer data flow: `src/renderer/src/features/personas/personas-api.ts`
    - Schema/service: `packages/core/database/schema/personaSchema.ts`, `packages/core/services/PersonaService.ts`
- Selected personas are injected as system instructions before chat streaming.
    - Stream assembly: `src/main/services/ChatStreamingService.ts`
- Composer supports the `@persona` directive and a persona selector shortcut.
    - UI/parser: `src/renderer/src/components/multimodal-input.tsx`

## Commands

- Built-in and custom slash commands for reusable prompt templates.
    - Built-ins: `packages/core/commands/builtins.ts`
    - Parser/template logic: `packages/core/commands/parser.ts`, `packages/core/commands/template.ts`, `packages/core/commands/registry.ts`
- Command settings support create, edit, delete, optional single-argument labels, and built-in/custom badges.
    - UI/orchestration: `src/renderer/src/components/command-management.tsx`, `src/renderer/src/features/commands/use-command-management-state.ts`
    - Renderer data flow: `src/renderer/src/features/commands/commands-api.ts`
    - Schema/service: `packages/core/database/schema/commandSchema.ts`, `packages/core/services/CommandService.ts`
- Composer resolves `/command` input before sending the message through normal chat streaming.
    - UI: `src/renderer/src/components/multimodal-input.tsx`

## MCP Servers And Tools

- Manage local and remote Model Context Protocol server definitions.
    - UI: `src/renderer/src/components/mcp-server-management.tsx`
    - Renderer data flow: `src/renderer/src/features/mcp-servers/mcp-servers-api.ts`, `src/renderer/src/features/mcp-servers/use-mcp-server-page-state.ts`
    - Schema/service: `packages/core/database/schema/mcpServerSchema.ts`, `packages/core/services/McpServerService.ts`
- Supported transports: stdio, SSE, and streamable HTTP.
    - Client manager: `packages/core/services/McpClientManager.ts`
- Enable/disable servers, edit JSON transport config, delete servers, list available tools, refresh tool lists, and set per-tool approval requirements.
    - UI: `src/renderer/src/components/mcp-server-management.tsx`
    - Runtime tool registry: `packages/core/services/McpClientManager.ts`
- Enabled MCP tools are included in model chat streams and workflow agent steps.
    - Chat: `src/main/services/ChatStreamingService.ts`
    - Workflow execution: `src/main/services/WorkflowExecutionService.ts`

## Web Search

- Exa web search can be configured with a securely stored API key and toggled on/off.
    - UI/orchestration: `src/renderer/src/components/web-search-management.tsx`, `src/renderer/src/features/web-search/use-web-search-page-state.ts`
    - Schema/service: `packages/core/database/schema/webSearchConfigSchema.ts`, `packages/core/services/WebSearchConfigService.ts`
    - Chat tool assembly: `src/main/services/ChatStreamingService.ts`
- Parallel search/extraction has a frontend-only preview configuration stored in the renderer Zustand store for the current renderer session; it is not currently part of backend chat tool assembly.
    - UI/state: `src/renderer/src/components/web-search-management.tsx`, `src/renderer/src/features/web-search/web-search-store.ts`
- Chat composer exposes configured web-search options. Current backend chat streams include Exa whenever the persisted Exa config is enabled; per-message web-search selection is renderer state only.
    - UI/state: `src/renderer/src/components/multimodal-input.tsx`, `src/renderer/src/lib/web-search-options.ts`, `src/renderer/src/features/chat/chat-store.ts`

## ACP Agents

- Manage Agent Client Protocol agents from installed definitions and custom command-based definitions.
    - UI/orchestration: `src/renderer/src/components/acp-agent-management.tsx`, `src/renderer/src/features/acp-agents/use-acp-agent-page-state.ts`
    - Renderer data flow: `src/renderer/src/features/acp-agents/acp-agents-api.ts`
    - Schema/service: `packages/core/database/schema/acpAgentSchema.ts`, `packages/core/services/AcpAgentService.ts`
- Browse, refresh, search, and install agents from the ACP registry when the registry distribution is installable.
    - Registry service: `packages/core/services/AcpRegistryService.ts`
    - Runtime service: `src/main/services/AcpAgentRuntimeService.ts`
- Enable/disable, test, edit, and delete agents. Agent env values are stored in the backend and renderer views expose only env key names.
    - DTOs: `packages/core/dto.ts`
    - UI: `src/renderer/src/components/acp-agent-management.tsx`
- Chat can switch from model runtime to agent runtime through the composer, an agent selector, workspace path input, or the `/agent` directive.
    - UI/parser: `src/renderer/src/components/multimodal-input.tsx`
    - Stream routing: `src/main/services/ChatStreamingService.ts`, `src/main/services/AcpAgentRuntimeService.ts`

## Workflows

- Workflow page with searchable workflow history, create/delete workflow actions, and a canvas workspace.
    - UI/orchestration: `src/renderer/src/app/(main)/workflow/page.tsx`, `src/renderer/src/components/workflow-page-content.tsx`, `src/renderer/src/components/workflow-history.tsx`, `src/renderer/src/features/workflows/use-workflow-page-state.ts`
    - Schema/service: `packages/core/database/schema/workflowSchema.ts`, `packages/core/services/WorkflowService.ts`
- Visual workflow canvas using React Flow, with draggable nodes, connectable edges, pointer/hand interaction modes, a movable toolbar, and a node picker.
    - UI: `src/renderer/src/components/workflow-canvas.tsx`
- Node templates include Start, Agent, Classify, End, If / Else, Loop, User Approval, MCP, and HTTP.
    - UI templates: `src/renderer/src/components/workflow-canvas.tsx`
- Workflow versions and run/event records are persisted in the database.
    - Schema/repositories: `packages/core/database/schema/workflowSchema.ts`, `packages/core/repositories/WorkflowRepository.ts`, `packages/core/repositories/WorkflowRunRepository.ts`
- Backend workflow execution can compile DAGs, execute agent/HTTP/MCP/user-approval/end nodes, persist run progress, stream run events, and cancel active runs.
    - Runtime: `src/main/services/WorkflowExecutionService.ts`, `packages/core/services/WorkflowRunService.ts`, `src/main/services/WorkflowRunStreamingService.ts`
    - Controllers: `src/main/controllers/WorkflowController.ts`, `src/main/http/WorkflowRunHttpController.ts`
- Current renderer run drawer stages a local execution-thread response while the backend workflow runner is connected to the UI.
    - UI: `src/renderer/src/components/workflow-workspace.tsx`

## Runtime And Platform Features

- Dual runtime: packaged Electron desktop app and local HTTP service share the same renderer, controllers, core package, generated RPC manifest, and chat stream service.
    - Docs: `docs/ARCHITECTURE.md`, `docs/specs/dual-runtime/`
    - Electron entry: `src/main/index.ts`
    - HTTP entry: `src/main/http/index.ts`
- Static-exported Next.js renderer selected at build/dev time with `NEXT_PUBLIC_COSMO_BACKEND=electron|http`.
    - Renderer backend resolver: `src/renderer/src/lib/store/app-data-source.ts`
    - Bounded store/provider: `src/renderer/src/lib/store/store.ts`, `src/renderer/src/app/store-provider.tsx`, `src/renderer/src/app/providers.tsx`
    - Browser-safe HTTP API: `src/preload/api.ts`
    - Generated preload modules: `src/preload/contracts/*.ts`, `src/preload/api/*.ts`, `src/preload/http-api/*.ts`, `src/preload/rpc-api.ts`
- Declarative IPC/RPC generation from controller decorators.
    - Decorators: `src/main/ipc/Decorators.ts`
    - Generator: `scripts/generate-api.ts`
    - Generated files: `src/preload/api.ts`, `src/preload/rpc-api.ts`, `src/preload/contracts/*.ts`, `src/preload/api/*.ts`, `src/preload/http-api/*.ts`, `src/main/http/rpc-manifest.ts`
- Local PGlite database with Drizzle schema and migrations.
    - Database docs: `docs/DATABASE.md`
    - Schema root: `packages/core/database/schema/`
    - Migrations: `migrations/`
- The renderer uses a single bounded Zustand store for shared UI state and SWR-backed feature hooks for backend request/response flows.
    - Store/provider: `src/renderer/src/lib/store/store.ts`, `src/renderer/src/app/store-provider.tsx`
    - Shared backend hook layer: `src/renderer/src/lib/store/app-data-source.ts`, `src/renderer/src/lib/store/backend-hooks.ts`
    - Feature request/response modules: `src/renderer/src/features/chat/chat-api.ts`, `src/renderer/src/features/providers/providers-api.ts`, `src/renderer/src/features/personas/personas-api.ts`, `src/renderer/src/features/commands/commands-api.ts`, `src/renderer/src/features/mcp-servers/mcp-servers-api.ts`, `src/renderer/src/features/web-search/web-search-api.ts`, `src/renderer/src/features/acp-agents/acp-agents-api.ts`, `src/renderer/src/features/workflows/workflows-api.ts`
    - Feature orchestration hooks: `src/renderer/src/features/chat/use-chat-page-state.ts`, `src/renderer/src/features/providers/use-provider-page-state.ts`, `src/renderer/src/features/personas/use-persona-page-state.ts`, `src/renderer/src/features/commands/use-command-management-state.ts`, `src/renderer/src/features/mcp-servers/use-mcp-server-page-state.ts`, `src/renderer/src/features/web-search/use-web-search-page-state.ts`, `src/renderer/src/features/acp-agents/use-acp-agent-page-state.ts`, `src/renderer/src/features/workflows/use-workflow-page-state.ts`, `src/renderer/src/features/settings/use-settings-page-state.ts`
    - Renderer-only slices: `src/renderer/src/features/chat/chat-store.ts`, `src/renderer/src/features/web-search/web-search-store.ts`, `src/renderer/src/lib/store/ui-feedback-store.ts`
- Light/dark theme support and a shared Tailwind/shadcn/Radix UI system.
    - Theme/UI docs: `docs/RENDERER_DESIGN.md`
    - UI primitives: `src/renderer/src/components/ui/`
- Security boundaries include context-isolated Electron preload, zod-validated IPC/HTTP RPC inputs, secret storage abstractions, and redacted renderer DTOs for secrets.
    - Agent guide: `AGENTS.md`
    - Preload: `src/preload/`
    - Secret store: `packages/core/platform/SecretStore.ts`, `src/main/platform/ElectronSecretStore.ts`
