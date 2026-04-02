'use client';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import type { CommandCreateInput, CommandDefinition, CommandUpdateInput } from 'core/dto';
import { Edit, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { logger } from '../../logger';

type ArgumentMode = 'none' | 'optional';

// Provide a clean form state when creating or resetting commands.
const buildDefaultFormState = () => ({
    name: '',
    description: '',
    template: '',
    argumentMode: 'none' as ArgumentMode,
    argumentLabel: '',
});

export function CommandManagement() {
    const [commands, setCommands] = useState<CommandDefinition[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingCommand, setEditingCommand] = useState<CommandDefinition | null>(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; commandId: string | null }>({
        isOpen: false,
        commandId: null,
    });
    const [formState, setFormState] = useState(buildDefaultFormState());

    // Refresh the list so UI reflects newly created or updated commands.
    const loadCommands = useCallback(async () => {
        try {
            const list = await window.api.command.listAll();
            setCommands(list);
        } catch (error) {
            logger.error('Failed to load commands', error);
            toast.error('Failed to load commands');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadCommands();
    }, [loadCommands]);

    // Reset state before opening the create dialog.
    const handleOpenDialog = () => {
        setEditingCommand(null);
        setFormState(buildDefaultFormState());
        setIsDialogOpen(true);
    };

    // Clear transient form state when closing the dialog.
    const handleCloseDialog = () => {
        setIsDialogOpen(false);
        setEditingCommand(null);
        setFormState(buildDefaultFormState());
    };

    // Load command details into the form for editing.
    const handleEdit = (command: CommandDefinition) => {
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

    // Save the current form state as a new or updated command.
    const handleSubmit = async (event: React.FormEvent) => {
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

        try {
            if (editingCommand) {
                const updatePayload: CommandUpdateInput = {
                    ...payloadBase,
                };
                const updated = await window.api.command.update(editingCommand.id as string, updatePayload);
                setCommands((prev) => prev.map((command) => (command.id === updated.id ? updated : command)));
                toast.success('Command updated');
            } else {
                const createPayload: CommandCreateInput = payloadBase;
                const created = await window.api.command.create(createPayload);
                setCommands((prev) => [...prev, created]);
                toast.success('Command created');
            }
            handleCloseDialog();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to save command.';
            toast.error(message);
            logger.error('Failed to save command', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Prompt for deletion confirmation for a custom command.
    const handleDeleteClick = (commandId: string) => {
        setDeleteConfirmation({ isOpen: true, commandId });
    };

    // Execute the delete after confirmation.
    const handleConfirmDelete = async () => {
        if (!deleteConfirmation.commandId) {
            return;
        }
        const commandId = deleteConfirmation.commandId;
        setDeleteConfirmation({ isOpen: false, commandId: null });
        try {
            await window.api.command.delete(commandId);
            setCommands((prev) => prev.filter((command) => command.id !== commandId));
            toast.success('Command deleted');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to delete command.';
            toast.error(message);
            logger.error('Failed to delete command', error);
        }
    };

    const hasCommands = commands.length > 0;

    if (isLoading) {
        return <div className="text-sm text-muted-foreground">Loading commands...</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-medium">Commands</h2>
                    <p className="text-xs text-muted-foreground mt-1">
                        Create quick prompts that start with a slash and optionally take one argument.
                    </p>
                </div>
                <Button onClick={handleOpenDialog}>Add Command</Button>
            </div>

            {hasCommands ? (
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[160px]">Name</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="w-[160px]">Type</TableHead>
                                <TableHead className="w-[180px]">Argument</TableHead>
                                <TableHead className="w-[120px] text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {commands.map((command) => (
                                <TableRow key={command.id ?? command.name}>
                                    <TableCell className="font-medium">{command.name}</TableCell>
                                    <TableCell className="text-muted-foreground">{command.description}</TableCell>
                                    <TableCell>
                                        <Badge variant={command.builtIn ? 'outline' : 'secondary'}>
                                            {command.builtIn ? 'Built-in' : 'Custom'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {command.argumentLabel ?? '—'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            aria-label={`Edit ${command.name}`}
                                            onClick={() => handleEdit(command)}
                                            disabled={command.builtIn}
                                        >
                                            <Edit className="size-4" />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            aria-label={`Delete ${command.name}`}
                                            onClick={() => handleDeleteClick(command.id as string)}
                                            disabled={command.builtIn}
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            ) : (
                <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                    No commands yet. Create one to get started.
                </div>
            )}

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingCommand ? 'Edit Command' : 'Create Command'}</DialogTitle>
                    </DialogHeader>
                    <form className="space-y-4" onSubmit={handleSubmit}>
                        <div className="space-y-2">
                            <label className="text-sm font-medium" htmlFor="command-name">
                                Name
                            </label>
                            <Input
                                id="command-name"
                                placeholder="/summarize"
                                value={formState.name}
                                onChange={(event) =>
                                    setFormState((prev) => ({
                                        ...prev,
                                        name: event.target.value,
                                    }))
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium" htmlFor="command-description">
                                Description
                            </label>
                            <Input
                                id="command-description"
                                placeholder="Describe what this command does."
                                value={formState.description}
                                onChange={(event) =>
                                    setFormState((prev) => ({
                                        ...prev,
                                        description: event.target.value,
                                    }))
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium" htmlFor="command-template">
                                Template
                            </label>
                            <Textarea
                                id="command-template"
                                placeholder="Summarize the last response. {{input}}"
                                value={formState.template}
                                onChange={(event) =>
                                    setFormState((prev) => ({
                                        ...prev,
                                        template: event.target.value,
                                    }))
                                }
                            />
                            <p className="text-xs text-muted-foreground">
                                Use <code>{'{{input}}'}</code> to inject the optional argument.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <span className="text-sm font-medium">Argument</span>
                            <Select
                                value={formState.argumentMode}
                                onValueChange={(value) =>
                                    setFormState((prev) => ({
                                        ...prev,
                                        argumentMode: value as ArgumentMode,
                                        argumentLabel: value === 'none' ? '' : prev.argumentLabel,
                                    }))
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select argument mode" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No argument</SelectItem>
                                    <SelectItem value="optional">Optional argument</SelectItem>
                                </SelectContent>
                            </Select>
                            {formState.argumentMode === 'optional' && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium" htmlFor="command-argument-label">
                                        Argument label
                                    </label>
                                    <Input
                                        id="command-argument-label"
                                        placeholder="Focus (optional)"
                                        value={formState.argumentLabel}
                                        onChange={(event) =>
                                            setFormState((prev) => ({
                                                ...prev,
                                                argumentLabel: event.target.value,
                                            }))
                                        }
                                    />
                                </div>
                            )}
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={handleCloseDialog}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {editingCommand ? 'Save' : 'Create'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={deleteConfirmation.isOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        setDeleteConfirmation({ isOpen: open, commandId: null });
                    }
                }}
                onConfirm={handleConfirmDelete}
                title="Delete command?"
                description="This action cannot be undone."
            />
        </div>
    );
}
