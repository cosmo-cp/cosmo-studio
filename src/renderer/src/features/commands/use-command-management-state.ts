'use client';

import {
    useDeleteCommandMutation,
    useGetCommandsQuery,
    useSaveCommandMutation,
} from '@/features/commands/commands-api';
import type { CommandCreateInput, CommandDefinition } from 'core/dto';
import { useState, type FormEvent } from 'react';

type ArgumentMode = 'none' | 'optional';

interface CommandFormState {
    name: string;
    description: string;
    template: string;
    argumentMode: ArgumentMode;
    argumentLabel: string;
}

function buildDefaultFormState(): CommandFormState {
    return {
        name: '',
        description: '',
        template: '',
        argumentMode: 'none',
        argumentLabel: '',
    };
}

export function useCommandManagementState() {
    const { data: commands = [], isLoading, error } = useGetCommandsQuery();
    const [saveCommand] = useSaveCommandMutation();
    const [deleteCommand] = useDeleteCommandMutation();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingCommand, setEditingCommand] = useState<CommandDefinition | null>(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; commandId: string | null }>({
        isOpen: false,
        commandId: null,
    });
    const [formState, setFormState] = useState<CommandFormState>(buildDefaultFormState());

    const openCreateDialog = () => {
        setEditingCommand(null);
        setFormState(buildDefaultFormState());
        setIsDialogOpen(true);
    };

    const closeDialog = () => {
        setIsDialogOpen(false);
        setEditingCommand(null);
        setFormState(buildDefaultFormState());
    };

    const handleDialogOpenChange = (open: boolean) => {
        if (!open) {
            closeDialog();
            return;
        }

        setIsDialogOpen(true);
    };

    const editCommand = (command: CommandDefinition) => {
        if (command.builtIn) {
            return;
        }

        setEditingCommand(command);
        setFormState({
            name: command.name,
            description: command.description,
            template: command.template,
            argumentMode: command.argumentLabel ? 'optional' : 'none',
            argumentLabel: command.argumentLabel ?? '',
        });
        setIsDialogOpen(true);
    };

    const submitCommand = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isSubmitting) {
            return;
        }

        setIsSubmitting(true);

        const payloadBase = {
            name: formState.name.trim(),
            description: formState.description.trim(),
            template: formState.template.trim(),
            argumentLabel: formState.argumentMode === 'optional' ? formState.argumentLabel.trim() || null : null,
        };

        const result = await saveCommand(
            editingCommand
                ? {
                      commandId: editingCommand.id as string,
                      input: payloadBase as CommandCreateInput,
                  }
                : {
                      input: payloadBase,
                  },
        );

        if ('data' in result) {
            closeDialog();
        }

        setIsSubmitting(false);
    };

    const requestDeleteCommand = (commandId: string) => {
        setDeleteConfirmation({ isOpen: true, commandId });
    };

    const clearDeleteConfirmation = () => {
        setDeleteConfirmation({ isOpen: false, commandId: null });
    };

    const confirmDeleteCommand = async () => {
        if (!deleteConfirmation.commandId) {
            return;
        }

        const commandId = deleteConfirmation.commandId;
        clearDeleteConfirmation();
        await deleteCommand(commandId);
    };

    return {
        commands,
        isLoading,
        error,
        hasCommands: commands.length > 0,
        isDialogOpen,
        isSubmitting,
        editingCommand,
        deleteConfirmation,
        formState,
        setFormState,
        openCreateDialog,
        closeDialog,
        handleDialogOpenChange,
        editCommand,
        submitCommand,
        requestDeleteCommand,
        clearDeleteConfirmation,
        confirmDeleteCommand,
    };
}
