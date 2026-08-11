'use client';

import {
    useDeletePersonaMutation,
    useGetPersonasQuery,
    useSavePersonaMutation,
} from '@/features/personas/personas-api';
import type { Persona } from 'core/dto';
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
    const [name, setName] = useState('');
    const [details, setDetails] = useState('');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [listError, setListError] = useState<string | null>(null);
    const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
    const [editingPersona, setEditingPersona] = useState<Persona | null>(null);

    const resetDialogState = () => {
        setName('');
        setDetails('');
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
        setDetails(persona.details ?? '');
        setErrorMessage(null);
        setIsOpen(true);
    };

    const trimmedName = name.trim();
    const trimmedDetails = details.trim();
    const canSave = useMemo(
        () => trimmedName.length > 0 && trimmedDetails.length > 0 && !isSaving,
        [trimmedDetails, trimmedName, isSaving],
    );

    const savePersonaDraft = async () => {
        if (!trimmedName && !trimmedDetails) {
            setErrorMessage('Name and details are required.');
            return;
        }

        if (!trimmedName) {
            setErrorMessage('Name is required.');
            return;
        }

        if (!trimmedDetails) {
            setErrorMessage('Details are required.');
            return;
        }

        if (editingPersona && !editingPersona.id) {
            setErrorMessage('Unable to update persona without an id.');
            return;
        }

        setIsSaving(true);
        setErrorMessage(null);

        const result = await savePersona(
            editingPersona
                ? {
                      personaId: editingPersona.id,
                      input: {
                          name: trimmedName,
                          details: trimmedDetails,
                      },
                  }
                : {
                      input: {
                          name: trimmedName,
                          details: trimmedDetails,
                      },
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
        details,
        errorMessage,
        isSaving,
        listError,
        isDeletingId,
        editingPersona,
        canSave,
        setIsOpen,
        setName,
        setDetails,
        handleDialogOpenChange,
        openCreateDialog,
        editPersona,
        savePersonaDraft,
        deletePersonaById,
        getErrorMessage,
    };
}
