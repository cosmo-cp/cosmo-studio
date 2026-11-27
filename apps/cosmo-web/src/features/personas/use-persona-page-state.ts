'use client';

import {
    useDeletePersonaMutation,
    useGetPersonasQuery,
    useSavePersonaMutation,
} from '@/features/personas/personas-api';
import type { Persona, PersonaCreateInput } from 'core/dto';
import { useMemo, useState } from 'react';

function getErrorMessage(error: unknown) {
    if (error instanceof Error) {
        return error.message;
    }

    if (typeof error === 'string') {
        return error;
    }

    return 'Unable to create persona.';
}

function isUniqueNameError(message: string) {
    const normalized = message.toLowerCase();
    return normalized.includes('unique') || normalized.includes('duplicate') || normalized.includes('already exists');
}

export function usePersonaPageState() {
    const { data: personas = [], isLoading, error } = useGetPersonasQuery();
    const [savePersona] = useSavePersonaMutation();
    const [deletePersona] = useDeletePersonaMutation();
    const [isOpen, setIsOpen] = useState(false);

    // Form fields - Identity
    const [name, setName] = useState('');
    const [role, setRole] = useState('');
    const [description, setDescription] = useState('');
    const [details, setDetails] = useState('');
    const [systemPrompt, setSystemPrompt] = useState('');
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

    // Intelligence
    const [modelIdentifier, setModelIdentifier] = useState<string | null>(null);
    const [temperature, setTemperature] = useState<number | null>(0.7);
    const [reasoningEffort, setReasoningEffort] = useState<string | null>(null);

    // Skills
    const [skills, setSkills] = useState<string[]>([]);

    // Tool Access
    const [toolAccessMode, setToolAccessMode] = useState<'all' | 'custom' | 'none'>('all');
    const [allowedMcpServers, setAllowedMcpServers] = useState<string[]>([]);
    const [allowedTools, setAllowedTools] = useState<string[]>([]);
    const [webSearchEnabled, setWebSearchEnabled] = useState(true);

    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [listError, setListError] = useState<string | null>(null);
    const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
    const [editingPersona, setEditingPersona] = useState<Persona | null>(null);

    const resetDialogState = () => {
        setName('');
        setRole('');
        setDescription('');
        setDetails('');
        setSystemPrompt('');
        setAvatarUrl(null);
        setModelIdentifier(null);
        setTemperature(0.7);
        setReasoningEffort(null);
        setSkills([]);
        setToolAccessMode('all');
        setAllowedMcpServers([]);
        setAllowedTools([]);
        setWebSearchEnabled(true);
        setErrorMessage(null);
        setIsSaving(false);
        setEditingPersona(null);
    };

    const handleDialogOpenChange = (open: boolean) => {
        setIsOpen(open);
        if (!open) {
            resetDialogState();
        }
    };

    const openCreateDialog = () => {
        resetDialogState();
        setIsOpen(true);
    };

    const editPersona = (persona: Persona) => {
        setEditingPersona(persona);
        setName(persona.name ?? '');
        setRole(persona.role ?? '');
        setDescription(persona.description ?? '');
        setDetails(persona.details ?? '');
        setSystemPrompt(persona.systemPrompt ?? persona.details ?? '');
        setAvatarUrl(persona.avatarUrl ?? null);
        setModelIdentifier(persona.modelIdentifier ?? null);
        setTemperature(persona.temperature ?? 0.7);
        setReasoningEffort(persona.reasoningEffort ?? null);
        setSkills(persona.skills ? [...persona.skills] : []);
        setToolAccessMode((persona.toolAccessMode as 'all' | 'custom' | 'none') ?? 'all');
        setAllowedMcpServers(persona.allowedMcpServers ? [...persona.allowedMcpServers] : []);
        setAllowedTools(persona.allowedTools ? [...persona.allowedTools] : []);
        setWebSearchEnabled(persona.webSearchEnabled ?? true);
        setErrorMessage(null);
        setIsOpen(true);
    };

    const toggleSkill = (skillName: string) => {
        setSkills((prev) => (prev.includes(skillName) ? prev.filter((s) => s !== skillName) : [...prev, skillName]));
    };

    const toggleMcpServer = (serverName: string) => {
        setAllowedMcpServers((prev) =>
            prev.includes(serverName) ? prev.filter((s) => s !== serverName) : [...prev, serverName],
        );
    };

    const toggleTool = (toolName: string) => {
        setAllowedTools((prev) => (prev.includes(toolName) ? prev.filter((t) => t !== toolName) : [...prev, toolName]));
    };

    const trimmedName = name.trim();
    const canSave = useMemo(() => trimmedName.length > 0 && !isSaving, [trimmedName, isSaving]);

    const savePersonaDraft = async () => {
        if (!trimmedName) {
            setErrorMessage('Name is required.');
            return;
        }

        if (editingPersona && !editingPersona.id) {
            setErrorMessage('Unable to update persona without an id.');
            return;
        }

        setIsSaving(true);
        setErrorMessage(null);

        const effectiveDetails = details.trim() || systemPrompt.trim() || description.trim() || trimmedName;

        const input: PersonaCreateInput = {
            name: trimmedName,
            role: role.trim() || null,
            description: description.trim() || null,
            details: effectiveDetails,
            systemPrompt: systemPrompt.trim() || details.trim() || null,
            avatarUrl: avatarUrl || null,
            modelIdentifier: modelIdentifier || null,
            temperature: temperature ?? 0.7,
            reasoningEffort: reasoningEffort || null,
            skills,
            toolAccessMode,
            allowedMcpServers,
            allowedTools,
            webSearchEnabled,
        };

        const result = await savePersona(
            editingPersona
                ? {
                      personaId: editingPersona.id,
                      input,
                  }
                : {
                      input,
                  },
        );

        if ('error' in result) {
            const message = getErrorMessage(result.error);
            if (isUniqueNameError(message)) {
                setErrorMessage('A persona with this name already exists.');
            } else {
                setErrorMessage(message);
            }
            setIsSaving(false);
            return;
        }

        setIsOpen(false);
        setIsSaving(false);
    };

    const deletePersonaById = async (persona: Persona) => {
        if (!persona.id) {
            setListError('Unable to delete persona without an id.');
            return;
        }

        const confirmed = window.confirm(`Delete persona "${persona.name}"?`);
        if (!confirmed) {
            return;
        }

        setIsDeletingId(persona.id);
        setListError(null);

        const result = await deletePersona(persona.id);
        if ('error' in result) {
            setListError(getErrorMessage(result.error));
        }
        setIsDeletingId(null);
    };

    return {
        personas,
        isLoading,
        error,
        hasPersonas: personas.length > 0,
        isOpen,
        name,
        role,
        description,
        details,
        systemPrompt,
        avatarUrl,
        modelIdentifier,
        temperature,
        reasoningEffort,
        skills,
        toolAccessMode,
        allowedMcpServers,
        allowedTools,
        webSearchEnabled,
        errorMessage,
        isSaving,
        listError,
        isDeletingId,
        editingPersona,
        canSave,
        setIsOpen,
        setName,
        setRole,
        setDescription,
        setDetails,
        setSystemPrompt,
        setAvatarUrl,
        setModelIdentifier,
        setTemperature,
        setReasoningEffort,
        toggleSkill,
        setToolAccessMode,
        toggleMcpServer,
        toggleTool,
        setWebSearchEnabled,
        handleDialogOpenChange,
        openCreateDialog,
        editPersona,
        savePersonaDraft,
        deletePersonaById,
        getErrorMessage,
    };
}
