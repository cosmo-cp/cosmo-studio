'use client';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { usePersonaPageState } from '@/features/personas/use-persona-page-state';
import { Edit, Plus, Trash2 } from 'lucide-react';

export function PersonaList() {
    const {
        personas,
        isLoading,
        error,
        hasPersonas,
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
    } = usePersonaPageState();

    return (
        <>
            <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h4 className="text-lg font-medium">Personas</h4>
                        <p className="text-xs text-muted-foreground">Create and manage personas</p>
                    </div>
                    <Button onClick={openCreateDialog}>
                        <Plus className="h-4 w-4" />
                        <span>Add persona</span>
                    </Button>
                </div>
                {(listError ?? (error ? getErrorMessage(error) : null)) ? (
                    <p className="text-sm text-destructive" role="alert">
                        {listError ?? getErrorMessage(error)}
                    </p>
                ) : null}
                {isLoading && !hasPersonas ? (
                    <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                        Loading personas...
                    </div>
                ) : hasPersonas ? (
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[220px]">Name</TableHead>
                                    <TableHead>Details</TableHead>
                                    <TableHead className="w-[140px] text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {personas.map((persona) => (
                                    <TableRow key={persona.id ?? persona.name}>
                                        <TableCell className="font-medium">
                                            <span className="block truncate">{persona.name}</span>
                                        </TableCell>
                                        <TableCell className="max-w-[360px] truncate text-muted-foreground">
                                            {persona.details ? persona.details : 'No details'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() => editPersona(persona)}
                                                disabled={!persona.id}
                                                aria-label={`Edit ${persona.name}`}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() => deletePersonaById(persona)}
                                                disabled={!persona.id || isDeletingId === persona.id}
                                                aria-label={`Delete ${persona.name}`}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                        No personas yet. Create one to get started.
                    </div>
                )}
            </section>

            <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{editingPersona ? 'Edit persona' : 'Add persona'}</DialogTitle>
                        <DialogDescription>
                            {editingPersona
                                ? 'Update the persona name and details.'
                                : 'Create a persona with a unique name and details.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium" htmlFor="persona-name">
                                Name
                            </label>
                            <Input
                                id="persona-name"
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                                placeholder="e.g. Research Assistant"
                                aria-invalid={Boolean(errorMessage)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium" htmlFor="persona-details">
                                Details
                            </label>
                            <Textarea
                                id="persona-details"
                                value={details}
                                onChange={(event) => setDetails(event.target.value)}
                                placeholder="Description or behavior notes"
                                className="max-h-40 overflow-y-auto"
                                aria-invalid={Boolean(errorMessage)}
                                rows={4}
                            />
                        </div>
                        {errorMessage ? (
                            <p className="text-sm text-destructive" role="alert">
                                {errorMessage}
                            </p>
                        ) : null}
                    </div>
                    <DialogFooter className="gap-2">
                        <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} disabled={isSaving}>
                            Cancel
                        </Button>
                        <Button type="button" onClick={savePersonaDraft} disabled={!canSave}>
                            {isSaving ? 'Saving...' : editingPersona ? 'Update persona' : 'Save persona'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
