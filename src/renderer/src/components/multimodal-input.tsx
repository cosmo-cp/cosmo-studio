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
import type { Chat, CommandDefinition, Persona, ProviderWithModels } from 'core/dto';
import { cn } from '@/lib/utils';
import { CheckIcon, ChevronUp, XIcon } from 'lucide-react';
import type { FocusEvent, KeyboardEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { logger } from '../../logger';
import { Attachment, AttachmentPreview, AttachmentRemove, Attachments } from './ai-elements/attachments';
import { McpToolsSelector } from './mcp-tools-selector';
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
    PromptInputSubmit,
    PromptInputTextarea,
    PromptInputTools,
    usePromptInputAttachments,
    usePromptInputController,
} from './ai-elements/prompt-input';

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
    stillAnswering?: boolean;
    onModelChange: (providerName: string, modelId: string) => void;
    onPersonaChange: (personaId: string | null) => void;
    stop?: UseChatHelpers<UIMessage>['stop'];
}) {
    const [input, setInput] = useState<string>('');
    const [providers, setProviders] = useState<ProviderWithModels[]>([]);
    const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
    const [personas, setPersonas] = useState<Persona[]>([]);
    const [commands, setCommands] = useState<CommandDefinition[]>([]);

    useEffect(() => {
        window.api.command
            .listAll()
            .then((fetchedCommands) => setCommands(fetchedCommands))
            .catch((error) => logger.error(error));
    }, []);

    useEffect(() => {
        window.api.modelProvider
            .getProvidersWithModels()
            .then((fetchedProviders) => setProviders(fetchedProviders))
            .catch((error) => logger.error(error));
    }, []);

    useEffect(() => {
        window.api.persona
            .getAll()
            .then((fetchedPersonas) => setPersonas(fetchedPersonas))
            .catch((error) => logger.error(error));
    }, []);

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

    const commandOptions = useMemo(() => {
        return commands.map((command) => ({
            id: command.id ?? command.name,
            name: command.name,
            description: command.description,
        }));
    }, [commands]);

    return (
        <PromptInputProvider>
            <PromptInputContent
                chat={chat}
                handlePersonaSelection={handlePersonaSelection}
                input={input}
                modelSelectorOpen={modelSelectorOpen}
                onModelChange={onModelChange}
                personaOptions={personaOptions}
                commandOptions={commandOptions}
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
    commandOptions,
    providers,
    selectedModelInfo,
    selectedPersonaId,
    setInput,
    setModelSelectorOpen,
    status,
    submitForm,
    stop,
}: {
    chat: Chat;
    handlePersonaSelection: (personaId: string | null) => void;
    input: string;
    modelSelectorOpen: boolean;
    onModelChange: (providerName: string, modelId: string) => void;
    personaOptions: { id: string; name: string }[];
    commandOptions: { id: string; name: string; description?: string }[];
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
    // @ mention is for personas, / is for commands
    const [dropdownType, setDropdownType] = useState<'mention' | 'command' | null>(null);
    const [dropdownSearch, setDropdownSearch] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const triggerIndexRef = useRef<number>(-1);

    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    const focusTextarea = useCallback(() => {
        window.requestAnimationFrame(() => {
            textareaRef.current?.focus();
        });
    }, []);

    const filteredOptions = useMemo(() => {
        if (dropdownType === 'mention') {
            if (!dropdownSearch) return personaOptions;
            const lower = dropdownSearch.toLowerCase();
            return personaOptions.filter((p) => p.name.toLowerCase().includes(lower));
        } else if (dropdownType === 'command') {
            if (!dropdownSearch) return commandOptions;
            const lower = dropdownSearch.toLowerCase();
            return commandOptions.filter((c) => c.name.toLowerCase().includes(lower));
        }
        return [];
    }, [dropdownType, dropdownSearch, personaOptions, commandOptions]) as Array<{
        id: string;
        name: string;
        description?: string;
    }>;

    const handleSelectOption = useCallback(
        (option: { id: string; name: string; description?: string }) => {
            if (dropdownType === 'mention') {
                handlePersonaSelection(option.id);
            }
            const beforeTrigger = input.slice(0, triggerIndexRef.current);
            const afterTrigger = input.slice(textareaRef.current?.selectionStart ?? triggerIndexRef.current + 1);

            const insertValue = dropdownType === 'mention' ? '' : option.name + ' ';
            const newText = beforeTrigger + insertValue + afterTrigger;

            setInput(newText);
            controller.textInput.setInput(newText);
            setDropdownType(null);
            focusTextarea();
        },
        [dropdownType, handlePersonaSelection, input, focusTextarea, setInput, controller],
    );

    const handleInputTextChange = useCallback(
        (newValue: string) => {
            setInput(newValue);
            if (dropdownType) {
                const cursor = textareaRef.current?.selectionStart ?? 0;
                // Handle deleting the trigger symbol
                if (cursor <= triggerIndexRef.current) {
                    setDropdownType(null);
                } else {
                    const search = newValue.slice(triggerIndexRef.current + 1, cursor);
                    if (/\s/.test(search)) {
                        setDropdownType(null);
                    } else {
                        setDropdownSearch(search);
                        setSelectedIndex(0);
                    }
                }
            }
        },
        [dropdownType, setInput],
    );

    const handleTextareaFocus = useCallback((event: FocusEvent<HTMLTextAreaElement>) => {
        textareaRef.current = event.currentTarget;
    }, []);

    const handleTextareaKeyDown = useCallback(
        (event: KeyboardEvent<HTMLTextAreaElement>) => {
            textareaRef.current = event.currentTarget;

            if (dropdownType) {
                if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    setSelectedIndex((s) => (s + 1) % (filteredOptions.length || 1));
                    return;
                }
                if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    setSelectedIndex((s) => (s - 1 + filteredOptions.length) % (filteredOptions.length || 1));
                    return;
                }
                if (event.key === 'Enter') {
                    event.preventDefault();
                    if (filteredOptions.length > 0) {
                        handleSelectOption(filteredOptions[selectedIndex]);
                    }
                    return;
                }
                if (event.key === 'Escape') {
                    event.preventDefault();
                    setDropdownType(null);
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
            const isCommandShortcut = event.key === '/' && !event.altKey && !event.ctrlKey && !event.metaKey;

            if (!isPersonaShortcut && !isCommandShortcut) {
                return;
            }

            const selectionStart = event.currentTarget.selectionStart ?? 0;
            const textBeforeCursor = event.currentTarget.value.slice(0, selectionStart);
            const isStartOfToken = textBeforeCursor.length === 0 || /\s$/.test(textBeforeCursor);
            if (!isStartOfToken) {
                return;
            }

            if (isPersonaShortcut) {
                triggerIndexRef.current = selectionStart;
                setDropdownSearch('');
                setSelectedIndex(0);
                setDropdownType('mention');
            } else if (isCommandShortcut) {
                triggerIndexRef.current = selectionStart;
                setDropdownSearch('');
                setSelectedIndex(0);
                setDropdownType('command');
            }
        },
        [
            dropdownType,
            filteredOptions,
            selectedIndex,
            handleSelectOption,
            input,
            selectedPersonaId,
            handlePersonaSelection,
        ],
    );

    return (
        <div className="relative w-full">
            {dropdownType && filteredOptions.length > 0 && (
                <div className="absolute z-50 mb-2 bottom-full left-4 min-w-[250px] overflow-hidden rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg outline-none max-h-[300px] overflow-y-auto">
                    {filteredOptions.map((option, i) => (
                        <div
                            key={option.id}
                            className={cn(
                                'flex flex-col cursor-pointer select-none rounded-md px-3 py-2 text-sm outline-none transition-colors',
                                i === selectedIndex
                                    ? 'bg-accent text-accent-foreground'
                                    : 'text-foreground/80 hover:bg-accent/50',
                            )}
                            onClick={() => handleSelectOption(option)}
                            onMouseEnter={() => setSelectedIndex(i)}
                        >
                            <span className="font-medium flex items-center gap-2">
                                {dropdownType === 'mention' ? `@${option.name}` : option.name}
                            </span>
                            {option.description && (
                                <span className="text-xs text-muted-foreground">{option.description}</span>
                            )}
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
                        placeholder="Type a message, use @ for personas, / for commands..."
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
                                <PromptInputButton className="w-max border border-border/40 px-3 py-1.5 h-9 bg-background/50 hover:bg-accent/50 transition-all duration-200">
                                    {chat.selectedModelId ? (
                                        <ModelSelectorName className="text-sm font-medium">
                                            {chat.selectedModelId}
                                        </ModelSelectorName>
                                    ) : (
                                        'Select Model'
                                    )}
                                    <ChevronUp className="h-3.5 w-3.5 opacity-50" />
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
                        <McpToolsSelector />
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
