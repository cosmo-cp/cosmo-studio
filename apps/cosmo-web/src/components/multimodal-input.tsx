'use client';

import { ModelSelectorLogo } from '@/components/provider-logo';
import {
    Attachment,
    AttachmentAction,
    AttachmentActions,
    AttachmentContent,
    AttachmentMedia,
    AttachmentTitle,
} from '@/components/ui/attachment';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from '@/components/ui/input-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { WorkspaceSelector } from '@/components/workspace-selector';
import { useGetAcpAgentsQuery } from '@/features/acp-agents/acp-agents-api';
import { serializeChatAttachments, useChatAttachments } from '@/features/chat/use-chat-attachments';
import { useExecuteCommandMutation } from '@/features/commands/commands-api';
import { useGetPersonasQuery } from '@/features/personas/personas-api';
import { useGetProvidersQuery } from '@/features/providers/providers-api';
import { useGetWebSearchOptionsQuery } from '@/features/web-search/web-search-api';
import { useAppStore } from '@/lib/store/hooks';
import { WEB_SEARCH_NONE_OPTION_ID, type WebSearchOption } from '@/lib/web-search-options';
import type { UseChatHelpers } from '@ai-sdk/react';
import type { FileUIPart, UIMessage } from 'ai';
import type { AcpAgentView, Chat, ProviderWithModels } from 'core/dto';
import {
    ArrowUp,
    BookOpen,
    CheckIcon,
    ChevronDown,
    ChevronUp,
    FileText,
    Paperclip,
    SlidersHorizontal,
    Square,
    X,
    Zap,
} from 'lucide-react';
import type { FocusEvent, KeyboardEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

type PromptInputMessage = { text: string; files: FileUIPart[] };

const PERSONA_NONE_VALUE = '__persona_none__';
const AGENT_NONE_VALUE = '__agent_none__';

const parsePersonaDirective = (text: string) => {
    const match = text.match(/^\s*@persona(?:\s*[:=])?\s*(?:"([^"]+)"|'([^']+)'|([^\s]+))\s*/i);
    if (!match) {
        return { text, personaName: undefined };
    }

    const personaName = match[1] ?? match[2] ?? match[3];
    const remainingText = text.slice(match[0].length).trimStart();
    return {
        text: remainingText,
        personaName,
    };
};

const parseAgentDirective = (text: string) => {
    const match = text.match(/^\s*\/agent\s+(?:"([^"]+)"|'([^']+)'|([^\s]+))\s*/i);
    if (!match) {
        return { text, agentName: undefined };
    }
    const agentName = match[1] ?? match[2] ?? match[3];
    return {
        text: text.slice(match[0].length).trimStart(),
        agentName,
    };
};

export function MultimodalInput({
    chat,
    hideAgentControls = false,
    hideWebSearchControls = false,
    status,
    sendMessage,
    onModelChange,
    onAgentChange,
    onPersonaChange,
    onWebSearchChange,
    selectedWebSearchOptionId,
    selectedWorkspaceId,
    isWorkspaceLocked = false,
    onWorkspaceChange,
    stop,
}: {
    chat: Chat;
    hideAgentControls?: boolean;
    hideWebSearchControls?: boolean;
    status: UseChatHelpers<UIMessage>['status'];
    messages: Array<UIMessage>;
    sendMessage: UseChatHelpers<UIMessage>['sendMessage'];
    className?: string;
    stillAnswering?: boolean;
    onModelChange: (providerName: string, modelId: string) => void;
    onAgentChange: (agentId: string | null, runtime: 'model' | 'agent') => void;
    onPersonaChange: (personaId: string | null) => void;
    onWebSearchChange: (optionId: string) => void;
    selectedWebSearchOptionId: string;
    selectedWorkspaceId?: string | null;
    isWorkspaceLocked?: boolean;
    onWorkspaceChange?: (workspaceId: string | null) => void;
    stop?: UseChatHelpers<UIMessage>['stop'];
}) {
    const parallelConfig = useAppStore((state) => state.parallelConfig);
    const { data: providers = [] } = useGetProvidersQuery();
    const { data: personas = [] } = useGetPersonasQuery();
    const { data: agents = [] } = useGetAcpAgentsQuery();
    const { data: webSearchOptionsPayload } = useGetWebSearchOptionsQuery(parallelConfig);
    const [executeCommand] = useExecuteCommandMutation();
    const webSearchOptions = webSearchOptionsPayload?.options ?? [];
    const [input, setInput] = useState<string>('');
    const [agentCwd, setAgentCwd] = useState<string>('');
    const [internalWorkspaceId, setInternalWorkspaceId] = useState<string | null>(null);
    const activeWorkspaceId = selectedWorkspaceId !== undefined ? selectedWorkspaceId : internalWorkspaceId;

    const handleWorkspaceChange = useCallback(
        (workspaceId: string | null) => {
            setInternalWorkspaceId(workspaceId);
            onWorkspaceChange?.(workspaceId);
        },
        [onWorkspaceChange],
    );
    const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
    const selectedRuntime = hideAgentControls ? 'model' : (chat.selectedRuntime ?? 'model');
    const selectedAgentId = hideAgentControls ? null : (chat.selectedAgentId ?? null);
    const resolvedWebSearchOptions =
        webSearchOptions.length > 0
            ? webSearchOptions
            : [
                  {
                      id: WEB_SEARCH_NONE_OPTION_ID,
                      label: 'Disabled',
                  },
              ];

    // Auto-select first available model if none selected.
    useEffect(() => {
        if (providers.length === 0) return;

        if (chat.selectedProvider && chat.selectedModelId) {
            return;
        }

        const firstProvider = providers.find((p) => p.models.length > 0);
        if (firstProvider) {
            const firstModel = firstProvider.models[0];
            if (firstModel) {
                onModelChange(firstProvider.name, firstModel.modelId);
            }
        }
    }, [providers, chat.selectedProvider, chat.selectedModelId, onModelChange]);

    const submitForm = useCallback(
        async (message: PromptInputMessage) => {
            let runtime = selectedRuntime;
            let resolvedAgentId = selectedAgentId;
            let modelId =
                chat.selectedProvider && chat.selectedModelId
                    ? chat.selectedProvider + ':' + chat.selectedModelId
                    : undefined;
            const { text: cleanedText } = parsePersonaDirective(message.text);
            const agentDirective = hideAgentControls
                ? { text: cleanedText, agentName: undefined }
                : parseAgentDirective(cleanedText);
            let resolvedText = agentDirective.text;

            if (agentDirective.agentName) {
                const directiveAgent = agents.find(
                    (agent) => agent.name.toLowerCase() === agentDirective.agentName!.toLowerCase(),
                );
                if (!directiveAgent) {
                    toast.error(`ACP agent "${agentDirective.agentName}" was not found.`);
                    return;
                }
                runtime = 'agent';
                resolvedAgentId = directiveAgent.id;
            }

            if (resolvedText.trim().startsWith('/') && !resolvedText.trim().startsWith('/agent')) {
                const commandResult = await executeCommand({ input: resolvedText });
                if ('error' in commandResult) {
                    return;
                }
                resolvedText = commandResult.data.resolvedText;
            }

            const activeAgent = agents.find((agent) => agent.id === resolvedAgentId);
            const effectiveWorkspaceId =
                activeWorkspaceId || chat.workspaceId || activeAgent?.defaultWorkspaceId || null;
            if (runtime === 'model' && !modelId) {
                return;
            }
            if (runtime === 'agent') {
                if (!activeAgent) {
                    toast.error('Select an ACP agent before sending.');
                    return;
                }
                if (!activeAgent.enabled) {
                    toast.error(`${activeAgent.name} is disabled.`);
                    return;
                }
                if (!effectiveWorkspaceId && !agentCwd.trim() && !activeAgent.defaultCwd) {
                    toast.error(`${activeAgent.name} requires a workspace.`);
                    return;
                }
                modelId = undefined;
            }

            sendMessage(
                {
                    text: resolvedText,
                    files: message.files,
                },
                {
                    metadata: {
                        modelId,
                        runtime,
                        agentId: runtime === 'agent' ? resolvedAgentId : null,
                        agentCwd: runtime === 'agent' ? agentCwd.trim() || activeAgent?.defaultCwd || null : null,
                        workspaceId: runtime === 'agent' ? effectiveWorkspaceId : null,
                        personaId: chat.selectedPersonaId ?? null,
                        webSearchOptionId:
                            hideWebSearchControls || selectedWebSearchOptionId === WEB_SEARCH_NONE_OPTION_ID
                                ? null
                                : selectedWebSearchOptionId,
                    },
                },
            )
                .catch((error) => {
                    const message = error instanceof Error ? error.message : String(error);
                    if (
                        message.toLowerCase().includes('busy') ||
                        message.toLowerCase().includes('workspace') ||
                        message.includes('409')
                    ) {
                        toast.error(message || 'Workspace is currently busy in another task or session.');
                    } else {
                        toast.error(message);
                    }
                })
                .finally(() => {
                    setInput('');
                });
        },
        [
            chat.selectedModelId,
            chat.selectedPersonaId,
            chat.selectedProvider,
            chat.workspaceId,
            activeWorkspaceId,
            agents,
            agentCwd,
            executeCommand,
            hideAgentControls,
            hideWebSearchControls,
            selectedAgentId,
            selectedWebSearchOptionId,
            selectedRuntime,
            sendMessage,
        ],
    );

    const handlePersonaSelection = useCallback(
        (personaId: string | null) => {
            onPersonaChange(personaId);
        },
        [onPersonaChange],
    );

    const personaOptions = useMemo(() => {
        return personas
            .map((persona) => ({
                id: persona.id ?? persona.name ?? '',
                name: persona.name ?? '',
            }))
            .filter((persona) => persona.id && persona.name);
    }, [personas]);

    return (
        <PromptInputContent
            chat={chat}
            handlePersonaSelection={handlePersonaSelection}
            agents={agents}
            agentCwd={agentCwd}
            input={input}
            modelSelectorOpen={modelSelectorOpen}
            onModelChange={onModelChange}
            onAgentChange={onAgentChange}
            onAgentCwdChange={setAgentCwd}
            personaOptions={personaOptions}
            providers={providers}
            selectedRuntime={selectedRuntime}
            selectedAgentId={selectedAgentId}
            selectedPersonaId={chat.selectedPersonaId ?? null}
            selectedWebSearchOptionId={selectedWebSearchOptionId}
            setInput={setInput}
            setModelSelectorOpen={setModelSelectorOpen}
            status={status}
            submitForm={submitForm}
            webSearchOptions={resolvedWebSearchOptions}
            hideAgentControls={hideAgentControls}
            hideWebSearchControls={hideWebSearchControls}
            onWebSearchChange={onWebSearchChange}
            activeWorkspaceId={activeWorkspaceId}
            isWorkspaceLocked={isWorkspaceLocked}
            onWorkspaceChange={handleWorkspaceChange}
            stop={stop}
        />
    );
}

// Keep composer interactions isolated from the page-level chat configuration.
function PromptInputContent({
    chat,
    handlePersonaSelection,
    agents,
    agentCwd,
    input,
    modelSelectorOpen,
    hideAgentControls,
    hideWebSearchControls,
    onAgentChange,
    onAgentCwdChange,
    onModelChange,
    onWebSearchChange,
    personaOptions,
    providers,
    selectedRuntime,
    selectedAgentId,
    selectedPersonaId,
    selectedWebSearchOptionId,
    setInput,
    setModelSelectorOpen,
    status,
    submitForm,
    webSearchOptions,
    activeWorkspaceId,
    isWorkspaceLocked,
    onWorkspaceChange,
    stop,
}: {
    chat: Chat;
    handlePersonaSelection: (personaId: string | null) => void;
    agents: AcpAgentView[];
    agentCwd: string;
    input: string;
    modelSelectorOpen: boolean;
    hideAgentControls: boolean;
    hideWebSearchControls: boolean;
    onAgentChange: (agentId: string | null, runtime: 'model' | 'agent') => void;
    onAgentCwdChange: (value: string) => void;
    onModelChange: (providerName: string, modelId: string) => void;
    onWebSearchChange: (optionId: string) => void;
    personaOptions: { id: string; name: string }[];
    providers: ProviderWithModels[];
    selectedRuntime: 'model' | 'agent';
    selectedAgentId: string | null;
    selectedPersonaId: string | null;
    selectedWebSearchOptionId: string;
    activeWorkspaceId?: string | null;
    isWorkspaceLocked?: boolean;
    onWorkspaceChange?: (workspaceId: string | null) => void;
    setInput: (value: string) => void;
    setModelSelectorOpen: (value: boolean) => void;
    status: UseChatHelpers<UIMessage>['status'];
    submitForm: (message: PromptInputMessage) => Promise<void>;
    webSearchOptions: WebSearchOption[];
    stop?: UseChatHelpers<UIMessage>['stop'];
}) {
    const attachments = useChatAttachments();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [personaSelectorOpen, setPersonaSelectorOpen] = useState(false);
    const [webSearchSelectorOpen, setWebSearchSelectorOpen] = useState(false);
    const [agentSelectorOpen, setAgentSelectorOpen] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const personaTriggerRef = useRef<HTMLButtonElement | null>(null);
    const personaSelectorTriggeredByShortcutRef = useRef(false);

    const selectedPersonaValue = useMemo(() => {
        if (!selectedPersonaId) {
            return PERSONA_NONE_VALUE;
        }
        return personaOptions.some((persona) => persona.id === selectedPersonaId)
            ? selectedPersonaId
            : PERSONA_NONE_VALUE;
    }, [personaOptions, selectedPersonaId]);
    const selectedPersonaLabel = useMemo(() => {
        if (selectedPersonaValue === PERSONA_NONE_VALUE) {
            return '@';
        }
        return personaOptions.find((persona) => persona.id === selectedPersonaValue)?.name ?? '@';
    }, [personaOptions, selectedPersonaValue]);

    const selectedWebSearchValue = useMemo(() => {
        return webSearchOptions.some((option) => option.id === selectedWebSearchOptionId && !option.disabled)
            ? selectedWebSearchOptionId
            : WEB_SEARCH_NONE_OPTION_ID;
    }, [selectedWebSearchOptionId, webSearchOptions]);

    const selectedAgentValue = useMemo(() => {
        if (!selectedAgentId) {
            return AGENT_NONE_VALUE;
        }
        return agents.some((agent) => agent.id === selectedAgentId) ? selectedAgentId : AGENT_NONE_VALUE;
    }, [agents, selectedAgentId]);

    const selectedAgent = useMemo(() => {
        return selectedAgentId ? agents.find((agent) => agent.id === selectedAgentId) : undefined;
    }, [agents, selectedAgentId]);
    const hasPersonaOptions = personaOptions.length > 0;

    const focusTextarea = useCallback(() => {
        window.requestAnimationFrame(() => {
            textareaRef.current?.focus();
        });
    }, []);

    const handlePersonaValueChange = useCallback(
        (value: string) => {
            handlePersonaSelection(value === PERSONA_NONE_VALUE ? null : value);
            personaSelectorTriggeredByShortcutRef.current = false;
            focusTextarea();
        },
        [focusTextarea, handlePersonaSelection],
    );

    const handlePersonaSelectorOpenChange = useCallback(
        (open: boolean) => {
            setPersonaSelectorOpen(open);
            if (!open && personaSelectorTriggeredByShortcutRef.current) {
                personaSelectorTriggeredByShortcutRef.current = false;
                focusTextarea();
            }
        },
        [focusTextarea],
    );

    const handleWebSearchValueChange = useCallback(
        (value: string) => {
            onWebSearchChange(value);
            focusTextarea();
        },
        [focusTextarea, onWebSearchChange],
    );

    // Ignore empty form-sync events so only the explicit None option clears the agent.
    const handleAgentValueChange = useCallback(
        (value: string) => {
            if (value === '') {
                return;
            }
            onAgentChange(value === AGENT_NONE_VALUE ? null : value, 'agent');
            const nextAgent = agents.find((agent) => agent.id === value);
            onAgentCwdChange(nextAgent?.defaultCwd ?? '');
            if (!isWorkspaceLocked) {
                onWorkspaceChange?.(nextAgent?.defaultWorkspaceId ?? null);
            }
            focusTextarea();
        },
        [agents, focusTextarea, isWorkspaceLocked, onAgentChange, onAgentCwdChange, onWorkspaceChange],
    );

    const handleTextareaFocus = useCallback((event: FocusEvent<HTMLTextAreaElement>) => {
        textareaRef.current = event.currentTarget;
    }, []);

    const handleTextareaKeyDown = useCallback(
        (event: KeyboardEvent<HTMLTextAreaElement>) => {
            textareaRef.current = event.currentTarget;
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                const button = event.currentTarget.form?.querySelector<HTMLButtonElement>('button[type="submit"]');
                if (button && !button.disabled) event.currentTarget.form?.requestSubmit();
                return;
            }
            if (event.key === 'Backspace' && !event.currentTarget.value && attachments.files.length) {
                event.preventDefault();
                attachments.remove(attachments.files[attachments.files.length - 1].id);
                return;
            }
            const isPersonaShortcut = event.key === '@' && !event.altKey && !event.ctrlKey && !event.metaKey;
            if (!isPersonaShortcut) {
                return;
            }
            if (!hasPersonaOptions) {
                return;
            }

            const selectionStart = event.currentTarget.selectionStart ?? 0;
            const textBeforeCursor = event.currentTarget.value.slice(0, selectionStart);
            const isStartOfToken = textBeforeCursor.length === 0 || /\s$/.test(textBeforeCursor);
            if (!isStartOfToken) {
                return;
            }

            event.preventDefault();
            personaSelectorTriggeredByShortcutRef.current = true;
            personaTriggerRef.current?.focus();
            setPersonaSelectorOpen(true);
        },
        [hasPersonaOptions, attachments],
    );

    return (
        <form
            className="w-full"
            onSubmit={async (event) => {
                event.preventDefault();
                try {
                    const files = await serializeChatAttachments(attachments.files);
                    await submitForm({ text: input, files });
                    attachments.clear();
                } catch (error) {
                    toast.error(error instanceof Error ? error.message : 'Could not read attachments');
                }
            }}
        >
            <input
                ref={fileInputRef}
                aria-label="Upload files"
                className="hidden"
                type="file"
                multiple
                onChange={(event) => {
                    if (event.currentTarget.files) attachments.add(event.currentTarget.files);
                    event.currentTarget.value = '';
                }}
            />
            <InputGroup className="overflow-hidden">
                <InputGroupAddon align="block-end" className="order-first flex-wrap gap-1">
                    <div className="flex flex-wrap gap-2">
                        {attachments.files.map((file) => (
                            <Attachment key={file.id} size="sm">
                                <AttachmentMedia variant={file.mediaType?.startsWith('image/') ? 'image' : 'icon'}>
                                    {file.mediaType?.startsWith('image/') ? (
                                        // Blob URLs are generated locally for selected files.
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={file.url} alt="" />
                                    ) : file.mediaType?.startsWith('video/') ? (
                                        <video className="size-full object-cover" muted src={file.url} />
                                    ) : (
                                        <FileText />
                                    )}
                                </AttachmentMedia>
                                <AttachmentContent>
                                    <AttachmentTitle>{file.filename ?? 'Attachment'}</AttachmentTitle>
                                </AttachmentContent>
                                <AttachmentActions>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <AttachmentAction
                                                type="button"
                                                aria-label={`Remove ${file.filename ?? 'attachment'}`}
                                                onClick={() => attachments.remove(file.id)}
                                            >
                                                <X />
                                            </AttachmentAction>
                                        </TooltipTrigger>
                                        <TooltipContent>Remove attachment</TooltipContent>
                                    </Tooltip>
                                </AttachmentActions>
                            </Attachment>
                        ))}
                    </div>
                </InputGroupAddon>
                <div className="contents">
                    <InputGroupTextarea
                        className="field-sizing-content max-h-48 min-h-16"
                        placeholder="What would you like to know?"
                        onPaste={(event) => {
                            const files = Array.from(event.clipboardData.items)
                                .map((item) => (item.kind === 'file' ? item.getAsFile() : null))
                                .filter((file): file is File => file !== null);
                            if (files.length) {
                                event.preventDefault();
                                attachments.add(files);
                            }
                        }}
                        onChange={(e) => setInput(e.target.value)}
                        onFocus={handleTextareaFocus}
                        onKeyDown={handleTextareaKeyDown}
                        value={input}
                    />
                </div>
                <InputGroupAddon align="block-end" className="justify-between gap-1">
                    <div className="flex min-w-0 items-center gap-1">
                        {!hideAgentControls ? (
                            <div className="flex h-8 items-center gap-0.5 rounded-lg border bg-muted/40 p-0.5">
                                <button
                                    aria-pressed={selectedRuntime === 'model'}
                                    className={
                                        selectedRuntime === 'model'
                                            ? 'h-7 rounded-md bg-background px-2.5 text-xs font-medium text-foreground shadow-xs flex items-center gap-1 cursor-pointer transition-colors'
                                            : 'h-7 rounded-md px-2.5 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer transition-colors'
                                    }
                                    onClick={() => {
                                        onAgentChange(null, 'model');
                                        setModelSelectorOpen(true);
                                    }}
                                    type="button"
                                >
                                    Model
                                    {selectedRuntime === 'model' && modelSelectorOpen ? (
                                        <ChevronUp className="h-3 w-3" />
                                    ) : (
                                        <ChevronDown className="h-3 w-3" />
                                    )}
                                </button>
                                <button
                                    aria-pressed={selectedRuntime === 'agent'}
                                    className={
                                        selectedRuntime === 'agent'
                                            ? 'h-7 rounded-md bg-background px-2.5 text-xs font-medium text-foreground shadow-xs flex items-center gap-1 cursor-pointer transition-colors'
                                            : 'h-7 rounded-md px-2.5 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer transition-colors'
                                    }
                                    onClick={() => onAgentChange(selectedAgentId, 'agent')}
                                    type="button"
                                >
                                    <Zap className="h-3 w-3 text-amber-500 fill-amber-500" />
                                    Agent
                                </button>
                            </div>
                        ) : null}
                        {selectedRuntime === 'model' ? (
                            <Popover onOpenChange={setModelSelectorOpen} open={modelSelectorOpen}>
                                <PopoverTrigger asChild>
                                    <button
                                        type="button"
                                        className="flex h-8 items-center gap-1.5 rounded-lg border bg-background px-2.5 text-xs font-medium text-foreground hover:bg-accent/60 cursor-pointer transition-colors shadow-2xs"
                                    >
                                        <ModelSelectorLogo provider={chat.selectedProvider ?? 'google'} />
                                        <span className="max-w-[130px] truncate">
                                            {chat.selectedModelId ?? 'Select Model'}
                                        </span>
                                        <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent
                                    align="start"
                                    side="top"
                                    sideOffset={8}
                                    className="w-72 overflow-hidden rounded-xl border bg-popover p-0 text-popover-foreground shadow-xl"
                                >
                                    <Command>
                                        <CommandInput placeholder="Search models..." />
                                        <CommandList>
                                            <CommandEmpty>No models found.</CommandEmpty>
                                            {providers.map((provider) => (
                                                <CommandGroup heading={provider.name} key={provider.name}>
                                                    {provider.models.map((m) => (
                                                        <CommandItem
                                                            key={m.modelId}
                                                            onSelect={() => {
                                                                setModelSelectorOpen(false);
                                                                onModelChange(provider.name, m.modelId);
                                                            }}
                                                            value={m.modelId}
                                                        >
                                                            <ModelSelectorLogo provider={provider.type.toString()} />
                                                            <span>{m.name}</span>
                                                            {chat.selectedProvider === provider.name &&
                                                            chat.selectedModelId === m.modelId ? (
                                                                <CheckIcon className="ml-auto size-4 text-[#0B6E99]" />
                                                            ) : null}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            ))}
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        ) : (
                            <>
                                <Select
                                    onOpenChange={setAgentSelectorOpen}
                                    onValueChange={handleAgentValueChange}
                                    open={agentSelectorOpen}
                                    value={selectedAgentValue}
                                >
                                    <SelectTrigger className="w-max">
                                        <SelectValue placeholder="Agent" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={AGENT_NONE_VALUE}>None</SelectItem>
                                        {agents.map((agent) => (
                                            <SelectItem disabled={!agent.enabled} key={agent.id} value={agent.id}>
                                                {agent.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <WorkspaceSelector
                                    aria-label="Agent workspace"
                                    className="h-8 max-w-48 text-xs"
                                    disabled={status === 'submitted' || status === 'streaming'}
                                    locked={isWorkspaceLocked}
                                    lockedReason="Workspace is locked while agent execution is in progress."
                                    onChange={onWorkspaceChange}
                                    placeholder={selectedAgent?.defaultCwd ? 'Default Workspace' : 'Select Workspace'}
                                    value={
                                        activeWorkspaceId ||
                                        chat.workspaceId ||
                                        selectedAgent?.defaultWorkspaceId ||
                                        null
                                    }
                                />
                            </>
                        )}
                        {!hideWebSearchControls ? (
                            <Select
                                onOpenChange={setWebSearchSelectorOpen}
                                onValueChange={handleWebSearchValueChange}
                                open={webSearchSelectorOpen}
                                value={selectedWebSearchValue}
                            >
                                <SelectTrigger aria-label="Web search" className="w-max">
                                    <SelectValue placeholder="Web Search" />
                                </SelectTrigger>
                                <SelectContent>
                                    {webSearchOptions.map((option) => (
                                        <SelectItem disabled={option.disabled} key={option.id} value={option.id}>
                                            <div className="flex flex-col">
                                                <span>{option.label}</span>
                                                <span className="text-xs text-muted-foreground">{option.label}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : null}
                        {hasPersonaOptions ? (
                            <DropdownMenu onOpenChange={handlePersonaSelectorOpenChange} open={personaSelectorOpen}>
                                <DropdownMenuTrigger asChild>
                                    <button
                                        aria-label="Persona"
                                        className="inline-flex h-8 max-w-40 items-center justify-center rounded-md px-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none"
                                        ref={personaTriggerRef}
                                        type="button"
                                    >
                                        <span
                                            aria-hidden
                                            className={
                                                selectedPersonaValue === PERSONA_NONE_VALUE
                                                    ? 'font-mono'
                                                    : 'max-w-full truncate'
                                            }
                                        >
                                            {selectedPersonaLabel}
                                        </span>
                                        <span className="sr-only">Persona</span>
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                    <DropdownMenuRadioGroup
                                        onValueChange={handlePersonaValueChange}
                                        value={selectedPersonaValue}
                                    >
                                        <DropdownMenuRadioItem value={PERSONA_NONE_VALUE}>None</DropdownMenuRadioItem>
                                        {personaOptions.map((persona) => (
                                            <DropdownMenuRadioItem key={persona.id} value={persona.id}>
                                                {persona.name}
                                            </DropdownMenuRadioItem>
                                        ))}
                                    </DropdownMenuRadioGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : null}
                    </div>

                    {/* Right actions toolbar */}
                    <div className="flex items-center gap-1 shrink-0 ml-auto">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer rounded-lg"
                                    onClick={() => fileInputRef.current?.click()}
                                    aria-label="Add attachments"
                                >
                                    <Paperclip className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Attach file</p>
                            </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    hidden={true}
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer rounded-lg"
                                    aria-label="Parameters"
                                >
                                    <SlidersHorizontal className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Parameters</p>
                            </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    hidden={true}
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer rounded-lg"
                                    aria-label="Knowledge base"
                                >
                                    <BookOpen className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Knowledge base</p>
                            </TooltipContent>
                        </Tooltip>

                        <InputGroupButton
                            aria-label={status === 'submitted' || status === 'streaming' ? 'Stop' : 'Submit'}
                            type={status === 'submitted' || status === 'streaming' ? 'button' : 'submit'}
                            onClick={status === 'submitted' || status === 'streaming' ? stop : undefined}
                            size="icon-sm"
                            variant="default"
                            disabled={
                                (selectedRuntime === 'model' && !chat.selectedModelId) ||
                                (selectedRuntime === 'agent' &&
                                    (!selectedAgentId ||
                                        !selectedAgent?.enabled ||
                                        (!activeWorkspaceId &&
                                            !chat.workspaceId &&
                                            !selectedAgent?.defaultWorkspaceId &&
                                            !agentCwd.trim() &&
                                            !selectedAgent.defaultCwd))) ||
                                (!input && status !== 'submitted' && status !== 'streaming')
                            }
                        >
                            {status === 'submitted' ? (
                                <Spinner />
                            ) : status === 'streaming' ? (
                                <Square aria-hidden="true" />
                            ) : (
                                <ArrowUp aria-hidden="true" />
                            )}
                        </InputGroupButton>
                    </div>
                </InputGroupAddon>
            </InputGroup>
        </form>
    );
}
