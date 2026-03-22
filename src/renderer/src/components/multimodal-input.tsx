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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { UseChatHelpers } from '@ai-sdk/react';
import type { UIMessage } from 'ai';
import { ModelModalityEnum } from 'core/database/schema/modelProviderSchema';
import type { Chat, Persona, ProviderWithModels } from 'core/dto';
import { cn } from '@/lib/utils';
import { CheckIcon, XIcon } from 'lucide-react';
import type { FocusEvent, KeyboardEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { logger } from '../../logger';
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
    usePromptInputController,
} from './ai-elements/prompt-input';

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
    stop?: UseChatHelpers<UIMessage>['stop'];
}) {
    const [input, setInput] = useState<string>('');
    const [providers, setProviders] = useState<ProviderWithModels[]>([]);
    const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
    const [personas, setPersonas] = useState<Persona[]>([]);

    useEffect(() => {
        window.api.modelProvider.getProvidersWithModels()
            .then(fetchedProviders => setProviders(fetchedProviders))
            .catch(error => logger.error(error));
    }, []);

    useEffect(() => {
        window.api.persona.getAll()
            .then(fetchedPersonas => setPersonas(fetchedPersonas))
            .catch(error => logger.error(error));
    }, []);

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

    const submitForm = useCallback(
        async (message: PromptInputMessage) => {
            if (!chat.selectedModelId) {
                return;
            }
            const modelId = chat.selectedProvider + ':' + chat.selectedModelId;
            const { text: cleanedText } = parsePersonaDirective(message.text);
            let resolvedText = cleanedText;

            if (cleanedText.trim().startsWith('/')) {
                try {
                    const result = await window.api.command.execute({
                        input: cleanedText,
                    });
                    resolvedText = result.resolvedText;
                } catch (error) {
                    const message = error instanceof Error ? error.message : 'Failed to execute command.';
                    toast.error(message);
                    return;
                }
            }

            sendMessage(
                {
                    text: resolvedText,
                    files: message.files,
                },
                {
                    metadata: { modelId, personaId: chat.selectedPersonaId ?? null },
                },
            )
                .catch((error) => {
                    toast.error(error.message);
                })
                .finally(() => {
                    setInput('');
                });
        },
        [chat.selectedModelId, chat.selectedProvider, chat.selectedPersonaId, sendMessage],
    );

    const handlePersonaSelection = useCallback((personaId: string | null) => {
        onPersonaChange(personaId);
    }, [onPersonaChange]);

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
                input={input}
                modelSelectorOpen={modelSelectorOpen}
                onModelChange={onModelChange}
                personaOptions={personaOptions}
                providers={providers}
                selectedModelInfo={selectedModelInfo}
                selectedPersonaId={chat.selectedPersonaId ?? null}
                setInput={setInput}
                setModelSelectorOpen={setModelSelectorOpen}
                status={status}
                submitForm={submitForm}
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
                                personaOptions,
                                providers,
                                selectedModelInfo,
                                selectedPersonaId,
                                setInput,
                                setModelSelectorOpen,
                                status,
                                submitForm,
                                stop
                            }: {
    chat: Chat;
    handlePersonaSelection: (personaId: string | null) => void;
    input: string;
    modelSelectorOpen: boolean;
    onModelChange: (providerName: string, modelId: string) => void;
    personaOptions: { id: string; name: string }[];
    providers: ProviderWithModels[];
    selectedModelInfo: { inputModalities: string[] } | undefined;
    selectedPersonaId: string | null;
    setInput: (value: string) => void;
    setModelSelectorOpen: (value: boolean) => void;
    status: UseChatHelpers<UIMessage>['status'];
    submitForm: (message: PromptInputMessage) => Promise<void>;
    stop?: UseChatHelpers<UIMessage>['stop'];
}) {
    const attachments = usePromptInputAttachments();
    const controller = usePromptInputController();
    const [mentionMenuOpen, setMentionMenuOpen] = useState(false);
    const [mentionSearch, setMentionSearch] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const mentionTriggerIndexRef = useRef<number>(-1);
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

    const handleSelectMention = useCallback(
        (id: string) => {
            handlePersonaSelection(id);
            setMentionMenuOpen(false);
            const beforeMention = input.slice(0, mentionTriggerIndexRef.current);
            const afterMention = input.slice(textareaRef.current?.selectionStart ?? mentionTriggerIndexRef.current + 1);
            const newText = beforeMention + afterMention;
            setInput(newText);
            controller.textInput.setInput(newText);
            focusTextarea();
        }
    }, [focusTextarea]);

    const handleInputTextChange = useCallback(
        (newValue: string) => {
            setInput(newValue);
            if (mentionMenuOpen) {
                const cursor = textareaRef.current?.selectionStart ?? 0;
                // Handle deleting the @ symbol
                if (cursor <= mentionTriggerIndexRef.current) {
                    setMentionMenuOpen(false);
                } else {
                    const search = newValue.slice(mentionTriggerIndexRef.current + 1, cursor);
                    if (/\s/.test(search)) {
                        setMentionMenuOpen(false);
                    } else {
                        setMentionSearch(search);
                        setSelectedIndex(0);
                    }
                }
            }
        },
        [mentionMenuOpen, setInput],
    );

    const handleTextareaFocus = useCallback((event: FocusEvent<HTMLTextAreaElement>) => {
        textareaRef.current = event.currentTarget;
    }, []);

    const handleTextareaKeyDown = useCallback(
        (event: KeyboardEvent<HTMLTextAreaElement>) => {
            textareaRef.current = event.currentTarget;

            if (mentionMenuOpen) {
                if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    setSelectedIndex((s) => (s + 1) % (filteredPersonas.length || 1));
                    return;
                }
                if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    setSelectedIndex((s) => (s - 1 + filteredPersonas.length) % (filteredPersonas.length || 1));
                    return;
                }
                if (event.key === 'Enter') {
                    event.preventDefault();
                    if (filteredPersonas.length > 0) {
                        handleSelectMention(filteredPersonas[selectedIndex].id);
                    }
                    return;
                }
                if (event.key === 'Escape') {
                    event.preventDefault();
                    setMentionMenuOpen(false);
                    return;
                }
            } else {
                if (event.key === 'Backspace' && input === '' && selectedPersonaId) {
                    event.preventDefault();
                    handlePersonaSelection(null);
                    return;
                }
            }

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

            mentionTriggerIndexRef.current = selectionStart;
            setMentionSearch('');
            setSelectedIndex(0);
            setMentionMenuOpen(true);
        },
        [
            mentionMenuOpen,
            filteredPersonas,
            selectedIndex,
            handleSelectMention,
            input,
            selectedPersonaId,
            handlePersonaSelection,
        ],
    );

    return (
        <div className="relative w-full">
            {mentionMenuOpen && filteredPersonas.length > 0 && (
                <div className="absolute z-50 mb-2 bottom-full left-4 min-w-[250px] overflow-hidden rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg outline-none">
                    {filteredPersonas.map((p, i) => (
                        <div
                            key={p.id}
                            className={cn(
                                'relative flex cursor-pointer select-none items-center rounded-md px-3 py-2 text-sm font-medium outline-none transition-colors',
                                i === selectedIndex
                                    ? 'bg-accent text-accent-foreground'
                                    : 'text-foreground/80 hover:bg-accent/50',
                            )}
                            onClick={() => handleSelectMention(p.id)}
                            onMouseEnter={() => setSelectedIndex(i)}
                        >
                            @{p.name}
                        </div>
                    ))}
                </div>
            )}
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
                    {selectedPersonaId && (
                        <div className="px-3 flex self-start items-center h-auto">
                            <span className="flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground border border-border shadow-sm">
                                @{personaOptions.find((p) => p.id === selectedPersonaId)?.name || 'Persona'}
                                <button
                                    type="button"
                                    className="ml-1 text-muted-foreground hover:text-foreground"
                                    onClick={() => handlePersonaSelection(null)}
                                >
                                    <XIcon className="size-3" />
                                </button>
                            </span>
                        </div>
                    )}
                    <PromptInputTextarea
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputTextChange(e.target.value)}
                        onFocus={handleTextareaFocus}
                        onKeyDown={handleTextareaKeyDown}
                        placeholder="Type a message, use @ for personas..."
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
                                            disabled={
                                                !selectedModelInfo?.inputModalities.includes(ModelModalityEnum.IMAGE)
                                            }
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
                                                        <div className="ml-auto size-4"/>
                                                    )}
                                                </ModelSelectorItem>
                                            ))}
                                        </ModelSelectorGroup>
                                    ))}
                                </ModelSelectorList>
                            </ModelSelectorContent>
                        </ModelSelector>
                    </PromptInputTools>
                    <PromptInputSubmit
                        disabled={!chat.selectedModelId || (!input && status !== 'submitted' && status !== 'streaming')}
                        status={status}
                        onStop={stop}
                    />
                </PromptInputFooter>
            </PromptInput>
        </div>
    );
}
