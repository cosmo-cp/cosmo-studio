'use client';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useCommandManagementState } from '@/features/commands/use-command-management-state';
import { Edit, Trash2 } from 'lucide-react';

export function CommandManagement() {
    const {
        commands,
        isLoading,
        error,
        hasCommands,
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
    } = useCommandManagementState();

    if (isLoading && !hasCommands) {
        return <div className="text-sm text-muted-foreground">Loading commands...</div>;
    }

    return (
        <div className="space-y-4">
            {error ? (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                </div>
            ) : null}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-medium">Commands</h2>
                    <p className="text-xs text-muted-foreground mt-1">
                        Create quick prompts that start with a slash and optionally take one argument.
                    </p>
                </div>
                <Button onClick={openCreateDialog}>Add Command</Button>
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
                                            onClick={() => editCommand(command)}
                                            disabled={command.builtIn}
                                        >
                                            <Edit className="size-4" />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            aria-label={`Delete ${command.name}`}
                                            onClick={() => requestDeleteCommand(command.id as string)}
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

            <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingCommand ? 'Edit Command' : 'Create Command'}</DialogTitle>
                    </DialogHeader>
                    <form className="space-y-4" onSubmit={submitCommand}>
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
                                        argumentMode: value as 'none' | 'optional',
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
                            <Button type="button" variant="ghost" onClick={closeDialog}>
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
                        clearDeleteConfirmation();
                    }
                }}
                onConfirm={confirmDeleteCommand}
                title="Delete command?"
                description="This action cannot be undone."
            />
        </div>
    );
}
