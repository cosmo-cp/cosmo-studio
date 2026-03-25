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
    ModelSelectorTrigger
} from "@/components/ai-elements/model-selector";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { UseChatHelpers } from '@ai-sdk/react';
import type { UIMessage } from 'ai';
import { ModelModalityEnum } from "core/database/schema/modelProviderSchema";
import type { Chat, ProviderWithModels } from "core/dto";
import { CheckIcon } from "lucide-react";
import type { FocusEvent, KeyboardEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {useAppDispatch, useAppSelector} from "@/lib/store/hooks";
import {executeCommand} from "@/lib/store/commands-store";
import {loadPersonas} from "@/lib/store/personas-store";
import {loadProviders} from "@/lib/store/providers-store";
import {loadWebSearchOptions} from "@/lib/store/web-search-store";
import {
    WEB_SEARCH_NONE_OPTION_ID,
    type WebSearchOption,
} from "@/lib/web-search-options";
import { Attachment, AttachmentPreview, AttachmentRemove, Attachments, } from './ai-elements/attachments';
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
    type PromptInputMessage,
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
} from './ai-elements/prompt-input';

const PERSONA_NONE_VALUE = "__persona_none__";

const parsePersonaDirective = (text: string) => {
    const match = text.match(/^\s*@persona(?:\s*[:=])?\s*(?:"([^"]+)"|'([^']+)'|([^\s]+))\s*/i);
    if (!match) {
        return {text, personaName: undefined};
    }

    const personaName = match[1] ?? match[2] ?? match[3];
    const remainingText = text.slice(match[0].length).trimStart();
    return {
        text: remainingText,
        personaName,
    };
};

export function MultimodalInput({
                                    chat,
                                    status,
                                    sendMessage,
                                    onModelChange,
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
    stillAnswering?: boolean,
    onModelChange: (providerName: string, modelId: string) => void;
    onPersonaChange: (personaId: string | null) => void;
    onWebSearchChange: (optionId: string) => void;
    selectedWebSearchOptionId: string;
    stop?: UseChatHelpers<UIMessage>['stop'];
}) {
    const dispatch = useAppDispatch();
    const providers = useAppSelector((state) => state.providers.items);
    const providersStatus = useAppSelector((state) => state.providers.status);
    const personas = useAppSelector((state) => state.personas.items);
    const personasStatus = useAppSelector((state) => state.personas.status);
    const webSearchOptions = useAppSelector((state) => state.webSearch.options);
    const webSearchOptionsStatus = useAppSelector((state) => state.webSearch.optionsStatus);
    const [input, setInput] = useState<string>('');
    const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
    const resolvedWebSearchOptions = webSearchOptions.length > 0 ? webSearchOptions : [
        {
            id: WEB_SEARCH_NONE_OPTION_ID,
            label: "No web search",
            description: "Answer with the selected model only.",
        },
    ];

    useEffect(() => {
        if (providersStatus === "idle") {
            void dispatch(loadProviders());
        }
    }, [dispatch, providersStatus]);

    useEffect(() => {
        if (personasStatus === "idle") {
            void dispatch(loadPersonas());
        }
    }, [dispatch, personasStatus]);

    useEffect(() => {
        if (webSearchOptionsStatus === "idle") {
            void dispatch(loadWebSearchOptions());
        }
    }, [dispatch, webSearchOptionsStatus]);

    const selectedModelInfo = useMemo(() => {
        if (providers.length === 0) return undefined;
        if (chat.selectedProvider && chat.selectedModelId) {
            const provider = providers.find(p => p.name === chat.selectedProvider);
            if (provider) {
                return provider.models.find(m => m.modelId === chat.selectedModelId);
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

        const firstProvider = providers.find(p => p.models.length > 0);
        if (firstProvider) {
            const firstModel = firstProvider.models[0];
            if (firstModel) {
                onModelChange(firstProvider.name, firstModel.modelId);
            }
        }
    }, [providers, chat.selectedProvider, chat.selectedModelId, onModelChange]);

    const submitForm = useCallback(async (message: PromptInputMessage) => {
        if (!chat.selectedModelId) {
            return;
        }
        const modelId = chat.selectedProvider + ":" + chat.selectedModelId
        const {text: cleanedText} = parsePersonaDirective(message.text);
        let resolvedText = cleanedText;

        if (cleanedText.trim().startsWith("/")) {
            try {
                const result = await dispatch(executeCommand({input: cleanedText})).unwrap();
                resolvedText = result.resolvedText;
            } catch (error) {
                const message = error instanceof Error ? error.message : "Failed to execute command.";
                toast.error(message);
                return;
            }
        }

        sendMessage({
            text: resolvedText,
            files: message.files
        }, {
            metadata: {
                modelId,
                personaId: chat.selectedPersonaId ?? null,
                webSearchOptionId: selectedWebSearchOptionId === WEB_SEARCH_NONE_OPTION_ID ?
                    null :
                    selectedWebSearchOptionId,
            }
        }).catch((error) => {
            toast.error(error.message);
        }).finally(() => {
            setInput('');
        })
    }, [
        chat.selectedModelId,
        chat.selectedPersonaId,
        chat.selectedProvider,
        dispatch,
        selectedWebSearchOptionId,
        sendMessage,
    ]);

    const handlePersonaSelection = useCallback((personaId: string | null) => {
        onPersonaChange(personaId);
    }, [onPersonaChange]);

    const personaOptions = useMemo(() => {
        return personas
            .map((persona) => ({
                id: persona.id ?? persona.name ?? '',
                name: persona.name ?? ''
            }))
            .filter((persona) => persona.id && persona.name);
    }, [personas]);

    return (
        <PromptInputProvider>
            <PromptInputContent
                chat={chat}
                handlePersonaSelection={handlePersonaSelection}
                input={input}
                modelSelectorOpen={modelSelectorOpen}
                onModelChange={onModelChange}
                personaOptions={personaOptions}
                providers={providers}
                selectedModelInfo={selectedModelInfo}
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
                                input,
                                modelSelectorOpen,
                                onModelChange,
                                onWebSearchChange,
                                personaOptions,
                                providers,
                                selectedModelInfo,
                                selectedPersonaId,
                                selectedWebSearchOptionId,
                                setInput,
                                setModelSelectorOpen,
                                status,
                                submitForm,
                                webSearchOptions,
                                stop
                            }: {
    chat: Chat;
    handlePersonaSelection: (personaId: string | null) => void;
    input: string;
    modelSelectorOpen: boolean;
    onModelChange: (providerName: string, modelId: string) => void;
    onWebSearchChange: (optionId: string) => void;
    personaOptions: { id: string; name: string }[];
    providers: ProviderWithModels[];
    selectedModelInfo: { inputModalities: string[] } | undefined;
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
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const personaSelectorTriggeredByShortcutRef = useRef(false);

    const selectedPersonaValue = useMemo(() => {
        if (!selectedPersonaId) {
            return PERSONA_NONE_VALUE;
        }
        return personaOptions.some((persona) => persona.id === selectedPersonaId) ?
            selectedPersonaId :
            PERSONA_NONE_VALUE;
    }, [personaOptions, selectedPersonaId]);

    const selectedWebSearchValue = useMemo(() => {
        return webSearchOptions.some((option) => option.id === selectedWebSearchOptionId && !option.disabled) ?
            selectedWebSearchOptionId :
            WEB_SEARCH_NONE_OPTION_ID;
    }, [selectedWebSearchOptionId, webSearchOptions]);

    const focusTextarea = useCallback(() => {
        window.requestAnimationFrame(() => {
            textareaRef.current?.focus();
        });
    }, []);

    const handlePersonaValueChange = useCallback((value: string) => {
        handlePersonaSelection(value === PERSONA_NONE_VALUE ? null : value);
        personaSelectorTriggeredByShortcutRef.current = false;
        focusTextarea();
    }, [focusTextarea, handlePersonaSelection]);

    const handlePersonaSelectorOpenChange = useCallback((open: boolean) => {
        setPersonaSelectorOpen(open);
        if (!open && personaSelectorTriggeredByShortcutRef.current) {
            personaSelectorTriggeredByShortcutRef.current = false;
            focusTextarea();
        }
    }, [focusTextarea]);

    const handleWebSearchValueChange = useCallback((value: string) => {
        onWebSearchChange(value);
        focusTextarea();
    }, [focusTextarea, onWebSearchChange]);

    const handleTextareaFocus = useCallback((event: FocusEvent<HTMLTextAreaElement>) => {
        textareaRef.current = event.currentTarget;
    }, []);

    const handleTextareaKeyDown = useCallback((event: KeyboardEvent<HTMLTextAreaElement>) => {
        textareaRef.current = event.currentTarget;
        const isPersonaShortcut = event.key === "@" && !event.altKey && !event.ctrlKey && !event.metaKey;
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
                            <AttachmentPreview/>
                            <AttachmentRemove/>
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
                    <PromptInputActionMenu>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span>
                                    <PromptInputActionMenuTrigger
                                        disabled={!selectedModelInfo?.inputModalities.includes(ModelModalityEnum.IMAGE)}>
                                    </PromptInputActionMenuTrigger>
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
                            <PromptInputActionAddAttachments/>
                        </PromptInputActionMenuContent>
                    </PromptInputActionMenu>
                    <ModelSelector
                        onOpenChange={setModelSelectorOpen}
                        open={modelSelectorOpen}
                    >
                        <ModelSelectorTrigger asChild>
                            <PromptInputButton className="w-max">
                                {chat.selectedModelId ? (
                                    <ModelSelectorName>
                                        {chat.selectedModelId}
                                    </ModelSelectorName>
                                ) : ('Select Model')}
                            </PromptInputButton>
                        </ModelSelectorTrigger>
                        <ModelSelectorContent>
                            <ModelSelectorInput placeholder="Search models"/>
                            <ModelSelectorList>
                                <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
                                {providers.map((provider) => (
                                    <ModelSelectorGroup heading={provider.name}
                                                        key={provider.name}>
                                        {provider.models
                                            .map((m) => (
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
                                                        <CheckIcon className="ml-auto size-4"/>
                                                    ) : (
                                                        <div className="ml-auto size-4"/>
                                                    )}
                                                </ModelSelectorItem>
                                            ))}
                                    </ModelSelectorGroup>
                                ))}
                            </ModelSelectorList>
                        </ModelSelectorContent>
                    </ModelSelector>
                    <PromptInputSelect
                        onOpenChange={setWebSearchSelectorOpen}
                        onValueChange={handleWebSearchValueChange}
                        open={webSearchSelectorOpen}
                        value={selectedWebSearchValue}
                    >
                        <PromptInputSelectTrigger
                            aria-label="Web search"
                            className="w-max"
                        >
                            <PromptInputSelectValue placeholder="Web Search"/>
                        </PromptInputSelectTrigger>
                        <PromptInputSelectContent>
                            {webSearchOptions.map((option) => (
                                <PromptInputSelectItem
                                    disabled={option.disabled}
                                    key={option.id}
                                    value={option.id}
                                >
                                    <div className="flex flex-col">
                                        <span>{option.label}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {option.description}
                                        </span>
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
                            <PromptInputSelectValue placeholder="Persona"/>
                        </PromptInputSelectTrigger>
                        <PromptInputSelectContent>
                            <PromptInputSelectItem value={PERSONA_NONE_VALUE}>
                                None
                            </PromptInputSelectItem>
                            {personaOptions.map((persona) => (
                                <PromptInputSelectItem
                                    key={persona.id}
                                    value={persona.id}
                                >
                                    {persona.name}
                                </PromptInputSelectItem>
                            ))}
                        </PromptInputSelectContent>
                    </PromptInputSelect>
                </PromptInputTools>
                <PromptInputSubmit
                    disabled={!chat.selectedModelId || (!input && status !== 'submitted' && status !== 'streaming')}
                    status={status}
                    onStop={stop}
                />
            </PromptInputFooter>
        </PromptInput>
    );
}
