'use client';

import {
    ModelSelector,
    ModelSelectorContent,
    ModelSelectorEmpty,
    ModelSelectorGroup,
    ModelSelectorInput,
    ModelSelectorItem,
    ModelSelectorList,
    ModelSelectorLogo,
    ModelSelectorName,
    ModelSelectorTrigger,
} from '@/components/ai-elements/model-selector';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useGetAcpAgentsQuery } from '@/features/acp-agents/acp-agents-api';
import { useExecuteCommandMutation } from '@/features/commands/commands-api';
import { useGetPersonasQuery } from '@/features/personas/personas-api';
import { useGetProvidersQuery } from '@/features/providers/providers-api';
import { useGetWebSearchOptionsQuery } from '@/features/web-search/web-search-api';
import { useAppStore } from '@/lib/store/hooks';
import { WEB_SEARCH_NONE_OPTION_ID, type WebSearchOption } from '@/lib/web-search-options';
import type { UseChatHelpers } from '@ai-sdk/react';
import type { UIMessage } from 'ai';
import { ModelModalityEnum } from 'core/database/schema/modelProviderSchema';
import type { AcpAgentView, Chat, ProviderWithModels } from 'core/dto';
import { CheckIcon } from 'lucide-react';
import type { FocusEvent, KeyboardEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Attachment, AttachmentPreview, AttachmentRemove, Attachments } from './ai-elements/attachments';
import {
    PromptInput,
    PromptInputActionAddAttachments,
    PromptInputActionMenu,
    PromptInputActionMenuContent,
    PromptInputActionMenuTrigger,
    PromptInputBody,
    PromptInputButton,
    PromptInputFooter,
    PromptInputHeader,
    PromptInputProvider,
    PromptInputSelect,
    PromptInputSelectContent,
    PromptInputSelectItem,
    PromptInputSelectTrigger,
    PromptInputSelectValue,
    PromptInputSubmit,
    PromptInputTextarea,
    PromptInputTools,
    usePromptInputAttachments,
    type PromptInputMessage,
} from './ai-elements/prompt-input';

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
    status,
    sendMessage,
    onModelChange,
    onAgentChange,
    onPersonaChange,
    onWebSearchChange,
    selectedWebSearchOptionId,
    stop,
}: {
    chat: Chat;
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
    const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
    const resolvedWebSearchOptions =
        webSearchOptions.length > 0
            ? webSearchOptions
            : [
                  {
                      id: WEB_SEARCH_NONE_OPTION_ID,
                      label: 'Disabled',
                  },
              ];

    const selectedModelInfo = useMemo(() => {
        if (providers.length === 0) return undefined;
        if (chat.selectedProvider && chat.selectedModelId) {
            const provider = providers.find((p) => p.name === chat.selectedProvider);
            if (provider) {
                return provider.models.find((m) => m.modelId === chat.selectedModelId);
            }
        }
        return undefined;
    }, [providers, chat.selectedProvider, chat.selectedModelId]);

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
            const selectedRuntime = chat.selectedRuntime ?? 'model';
            let runtime = selectedRuntime;
            let selectedAgentId = chat.selectedAgentId ?? null;
            let modelId =
                chat.selectedProvider && chat.selectedModelId
                    ? chat.selectedProvider + ':' + chat.selectedModelId
                    : undefined;
            const { text: cleanedText } = parsePersonaDirective(message.text);
            const agentDirective = parseAgentDirective(cleanedText);
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
                selectedAgentId = directiveAgent.id;
            }

            if (resolvedText.trim().startsWith('/') && !resolvedText.trim().startsWith('/agent')) {
                const commandResult = await executeCommand({ input: resolvedText });
                if ('error' in commandResult) {
                    return;
                }
                resolvedText = commandResult.data.resolvedText;
            }

            const activeAgent = agents.find((agent) => agent.id === selectedAgentId);
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
                if (!agentCwd.trim() && !activeAgent.defaultCwd) {
                    toast.error(`${activeAgent.name} requires a workspace path.`);
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
                        agentId: runtime === 'agent' ? selectedAgentId : null,
                        agentCwd: runtime === 'agent' ? agentCwd.trim() || activeAgent?.defaultCwd || null : null,
                        personaId: chat.selectedPersonaId ?? null,
                        webSearchOptionId:
                            selectedWebSearchOptionId === WEB_SEARCH_NONE_OPTION_ID ? null : selectedWebSearchOptionId,
                    },
                },
            )
                .catch((error) => {
                    toast.error(error.message);
                })
                .finally(() => {
                    setInput('');
                });
        },
        [
            chat.selectedModelId,
            chat.selectedPersonaId,
            chat.selectedProvider,
            chat.selectedRuntime,
            chat.selectedAgentId,
            agents,
            agentCwd,
            executeCommand,
            selectedWebSearchOptionId,
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
        <PromptInputProvider>
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
                selectedModelInfo={selectedModelInfo}
                selectedRuntime={chat.selectedRuntime ?? 'model'}
                selectedAgentId={chat.selectedAgentId ?? null}
                selectedPersonaId={chat.selectedPersonaId ?? null}
                selectedWebSearchOptionId={selectedWebSearchOptionId}
                setInput={setInput}
                setModelSelectorOpen={setModelSelectorOpen}
                status={status}
                submitForm={submitForm}
                webSearchOptions={resolvedWebSearchOptions}
                onWebSearchChange={onWebSearchChange}
                stop={stop}
            />
        </PromptInputProvider>
    );
}

// Inner component that uses the attachments hook (must be inside PromptInputProvider)
function PromptInputContent({
    chat,
    handlePersonaSelection,
    agents,
    agentCwd,
    input,
    modelSelectorOpen,
    onAgentChange,
    onAgentCwdChange,
    onModelChange,
    onWebSearchChange,
    personaOptions,
    providers,
    selectedModelInfo,
    selectedRuntime,
    selectedAgentId,
    selectedPersonaId,
    selectedWebSearchOptionId,
    setInput,
    setModelSelectorOpen,
    status,
    submitForm,
    webSearchOptions,
    stop,
}: {
    chat: Chat;
    handlePersonaSelection: (personaId: string | null) => void;
    agents: AcpAgentView[];
    agentCwd: string;
    input: string;
    modelSelectorOpen: boolean;
    onAgentChange: (agentId: string | null, runtime: 'model' | 'agent') => void;
    onAgentCwdChange: (value: string) => void;
    onModelChange: (providerName: string, modelId: string) => void;
    onWebSearchChange: (optionId: string) => void;
    personaOptions: { id: string; name: string }[];
    providers: ProviderWithModels[];
    selectedModelInfo: { inputModalities: string[] } | undefined;
    selectedRuntime: 'model' | 'agent';
    selectedAgentId: string | null;
    selectedPersonaId: string | null;
    selectedWebSearchOptionId: string;
    setInput: (value: string) => void;
    setModelSelectorOpen: (value: boolean) => void;
    status: UseChatHelpers<UIMessage>['status'];
    submitForm: (message: PromptInputMessage) => Promise<void>;
    webSearchOptions: WebSearchOption[];
    stop?: UseChatHelpers<UIMessage>['stop'];
}) {
    const attachments = usePromptInputAttachments();
    const [personaSelectorOpen, setPersonaSelectorOpen] = useState(false);
    const [webSearchSelectorOpen, setWebSearchSelectorOpen] = useState(false);
    const [agentSelectorOpen, setAgentSelectorOpen] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const personaSelectorTriggeredByShortcutRef = useRef(false);

    const selectedPersonaValue = useMemo(() => {
        if (!selectedPersonaId) {
            return PERSONA_NONE_VALUE;
        }
        return personaOptions.some((persona) => persona.id === selectedPersonaId)
            ? selectedPersonaId
            : PERSONA_NONE_VALUE;
    }, [personaOptions, selectedPersonaId]);

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

    const handleAgentValueChange = useCallback(
        (value: string) => {
            onAgentChange(value === AGENT_NONE_VALUE ? null : value, 'agent');
            const nextAgent = agents.find((agent) => agent.id === value);
            onAgentCwdChange(nextAgent?.defaultCwd ?? '');
            focusTextarea();
        },
        [agents, focusTextarea, onAgentChange, onAgentCwdChange],
    );

    const handleTextareaFocus = useCallback((event: FocusEvent<HTMLTextAreaElement>) => {
        textareaRef.current = event.currentTarget;
    }, []);

    const handleTextareaKeyDown = useCallback((event: KeyboardEvent<HTMLTextAreaElement>) => {
        textareaRef.current = event.currentTarget;
        const isPersonaShortcut = event.key === '@' && !event.altKey && !event.ctrlKey && !event.metaKey;
        if (!isPersonaShortcut) {
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
        setPersonaSelectorOpen(true);
    }, []);

    return (
        <PromptInput globalDrop multiple onSubmit={submitForm}>
            <PromptInputHeader>
                <Attachments>
                    {attachments.files.map((file) => (
                        <Attachment key={file.id} data={file} onRemove={() => attachments.remove(file.id)}>
                            <AttachmentPreview />
                            <AttachmentRemove />
                        </Attachment>
                    ))}
                </Attachments>
            </PromptInputHeader>
            <PromptInputBody>
                <PromptInputTextarea
                    onChange={(e) => setInput(e.target.value)}
                    onFocus={handleTextareaFocus}
                    onKeyDown={handleTextareaKeyDown}
                    value={input}
                />
            </PromptInputBody>
            <PromptInputFooter>
                <PromptInputTools>
                    <div className="flex h-8 items-center gap-0.5 rounded-md border bg-background p-0.5">
                        <button
                            aria-pressed={selectedRuntime === 'model'}
                            className={
                                selectedRuntime === 'model'
                                    ? 'h-6 rounded-sm bg-secondary px-2 text-xs font-medium text-secondary-foreground'
                                    : 'h-6 rounded-sm px-2 text-xs text-muted-foreground hover:text-foreground'
                            }
                            onClick={() => onAgentChange(null, 'model')}
                            type="button"
                        >
                            Model
                        </button>
                        <button
                            aria-pressed={selectedRuntime === 'agent'}
                            className={
                                selectedRuntime === 'agent'
                                    ? 'h-6 rounded-sm bg-secondary px-2 text-xs font-medium text-secondary-foreground'
                                    : 'h-6 rounded-sm px-2 text-xs text-muted-foreground hover:text-foreground'
                            }
                            onClick={() => onAgentChange(selectedAgentId, 'agent')}
                            type="button"
                        >
                            Agent
                        </button>
                    </div>
                    <PromptInputActionMenu>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span>
                                    <PromptInputActionMenuTrigger
                                        disabled={!selectedModelInfo?.inputModalities.includes(ModelModalityEnum.IMAGE)}
                                    ></PromptInputActionMenuTrigger>
                                </span>
                            </TooltipTrigger>
                            <TooltipContent>
                                {selectedModelInfo?.inputModalities.includes(ModelModalityEnum.IMAGE) ? (
                                    <p>Attach Images</p>
                                ) : (
                                    <p>Images not supported by selected Model</p>
                                )}
                            </TooltipContent>
                        </Tooltip>
                        <PromptInputActionMenuContent>
                            <PromptInputActionAddAttachments />
                        </PromptInputActionMenuContent>
                    </PromptInputActionMenu>
                    {selectedRuntime === 'model' ? (
                        <ModelSelector onOpenChange={setModelSelectorOpen} open={modelSelectorOpen}>
                            <ModelSelectorTrigger asChild>
                                <PromptInputButton className="w-max">
                                    {chat.selectedModelId ? (
                                        <ModelSelectorName>{chat.selectedModelId}</ModelSelectorName>
                                    ) : (
                                        'Select Model'
                                    )}
                                </PromptInputButton>
                            </ModelSelectorTrigger>
                            <ModelSelectorContent>
                                <ModelSelectorInput placeholder="Search models" />
                                <ModelSelectorList>
                                    <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
                                    {providers.map((provider) => (
                                        <ModelSelectorGroup heading={provider.name} key={provider.name}>
                                            {provider.models.map((m) => (
                                                <ModelSelectorItem
                                                    key={m.modelId}
                                                    onSelect={() => {
                                                        setModelSelectorOpen(false);
                                                        onModelChange(provider.name, m.modelId);
                                                    }}
                                                    value={m.modelId}
                                                >
                                                    <ModelSelectorName>{m.name}</ModelSelectorName>
                                                    <ModelSelectorLogo
                                                        key={provider.type.toString()}
                                                        provider={provider.type.toString()}
                                                    />
                                                    {chat.selectedProvider === provider.name &&
                                                    chat.selectedModelId === m.modelId ? (
                                                        <CheckIcon className="ml-auto size-4" />
                                                    ) : (
                                                        <div className="ml-auto size-4" />
                                                    )}
                                                </ModelSelectorItem>
                                            ))}
                                        </ModelSelectorGroup>
                                    ))}
                                </ModelSelectorList>
                            </ModelSelectorContent>
                        </ModelSelector>
                    ) : (
                        <>
                            <PromptInputSelect
                                onOpenChange={setAgentSelectorOpen}
                                onValueChange={handleAgentValueChange}
                                open={agentSelectorOpen}
                                value={selectedAgentValue}
                            >
                                <PromptInputSelectTrigger className="w-max">
                                    <PromptInputSelectValue placeholder="Agent" />
                                </PromptInputSelectTrigger>
                                <PromptInputSelectContent>
                                    <PromptInputSelectItem value={AGENT_NONE_VALUE}>None</PromptInputSelectItem>
                                    {agents.map((agent) => (
                                        <PromptInputSelectItem
                                            disabled={!agent.enabled}
                                            key={agent.id}
                                            value={agent.id}
                                        >
                                            {agent.name}
                                        </PromptInputSelectItem>
                                    ))}
                                </PromptInputSelectContent>
                            </PromptInputSelect>
                            <Input
                                aria-label="Agent workspace"
                                className="h-8 w-48"
                                onChange={(event) => onAgentCwdChange(event.target.value)}
                                placeholder={selectedAgent?.defaultCwd || 'Workspace path'}
                                value={agentCwd}
                            />
                        </>
                    )}
                    <PromptInputSelect
                        onOpenChange={setWebSearchSelectorOpen}
                        onValueChange={handleWebSearchValueChange}
                        open={webSearchSelectorOpen}
                        value={selectedWebSearchValue}
                    >
                        <PromptInputSelectTrigger aria-label="Web search" className="w-max">
                            <PromptInputSelectValue placeholder="Web Search" />
                        </PromptInputSelectTrigger>
                        <PromptInputSelectContent>
                            {webSearchOptions.map((option) => (
                                <PromptInputSelectItem disabled={option.disabled} key={option.id} value={option.id}>
                                    <div className="flex flex-col">
                                        <span>{option.label}</span>
                                        <span className="text-xs text-muted-foreground">{option.label}</span>
                                    </div>
                                </PromptInputSelectItem>
                            ))}
                        </PromptInputSelectContent>
                    </PromptInputSelect>
                    <PromptInputSelect
                        onOpenChange={handlePersonaSelectorOpenChange}
                        onValueChange={handlePersonaValueChange}
                        open={personaSelectorOpen}
                        value={selectedPersonaValue}
                    >
                        <PromptInputSelectTrigger className="w-max">
                            <PromptInputSelectValue placeholder="Persona" />
                        </PromptInputSelectTrigger>
                        <PromptInputSelectContent>
                            <PromptInputSelectItem value={PERSONA_NONE_VALUE}>None</PromptInputSelectItem>
                            {personaOptions.map((persona) => (
                                <PromptInputSelectItem key={persona.id} value={persona.id}>
                                    {persona.name}
                                </PromptInputSelectItem>
                            ))}
                        </PromptInputSelectContent>
                    </PromptInputSelect>
                </PromptInputTools>
                <PromptInputSubmit
                    disabled={
                        (selectedRuntime === 'model' && !chat.selectedModelId) ||
                        (selectedRuntime === 'agent' &&
                            (!selectedAgentId ||
                                !selectedAgent?.enabled ||
                                (!agentCwd.trim() && !selectedAgent.defaultCwd))) ||
                        (!input && status !== 'submitted' && status !== 'streaming')
                    }
                    status={status}
                    onStop={stop}
                />
            </PromptInputFooter>
        </PromptInput>
    );
}
