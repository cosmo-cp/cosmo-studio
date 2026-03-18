'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Persona } from 'core/dto';
import { Edit, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {useAppDispatch, useAppSelector} from "@/lib/store/hooks";
import {deletePersona, loadPersonas, savePersona} from "@/lib/store/personas-store";

const getErrorMessage = (error: unknown) => {
    if (error instanceof Error) {
        return error.message;
    }

    if (typeof error === 'string') {
        return error;
    }

    return 'Unable to create persona.';
};

const isUniqueNameError = (message: string) => {
    const normalized = message.toLowerCase();
    return normalized.includes('unique') || normalized.includes('duplicate') || normalized.includes('already exists');
};

export function PersonaList() {
    const dispatch = useAppDispatch();
    const personas = useAppSelector((state) => state.personas.items);
    const personasStatus = useAppSelector((state) => state.personas.status);
    const personasError = useAppSelector((state) => state.personas.errorMessage);
    const [isOpen, setIsOpen] = useState(false);
    const [name, setName] = useState('');
    const [details, setDetails] = useState('');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [listError, setListError] = useState<string | null>(null);
    const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
    const [editingPersona, setEditingPersona] = useState<Persona | null>(null);

    useEffect(() => {
        if (personasStatus === 'idle') {
            void dispatch(loadPersonas());
        }
    }, [dispatch, personasStatus]);

    useEffect(() => {
        if (!isOpen) {
            setName('');
            setDetails('');
            setErrorMessage(null);
            setIsSaving(false);
            setEditingPersona(null);
        }
    }, [isOpen]);

    const hasPersonas = personas.length > 0;
    const trimmedName = name.trim();
    const trimmedDetails = details.trim();

    const canSave = useMemo(() => {
        return trimmedName.length > 0 && trimmedDetails.length > 0 && !isSaving;
    }, [trimmedName, trimmedDetails, isSaving]);

    const handleSave = async () => {
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

        try {
            if (editingPersona) {
                await dispatch(savePersona({
                    personaId: editingPersona.id,
                    input: {
                    name: trimmedName,
                    details: trimmedDetails
                    },
                })).unwrap();
            } else {
                await dispatch(savePersona({
                    input: {
                    name: trimmedName,
                    details: trimmedDetails
                    },
                })).unwrap();
            }
            setIsOpen(false);
        } catch (error) {
            const message = getErrorMessage(error);
            if (isUniqueNameError(message)) {
                setErrorMessage('A persona with this name already exists.');
            } else {
                setErrorMessage(message);
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleEdit = (persona: Persona) => {
        setEditingPersona(persona);
        setName(persona.name ?? '');
        setDetails(persona.details ?? '');
        setErrorMessage(null);
        setIsOpen(true);
    };

    const handleDelete = async (persona: Persona) => {
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

        try {
            await dispatch(deletePersona(persona.id)).unwrap();
        } catch (error) {
            setListError(getErrorMessage(error));
        } finally {
            setIsDeletingId(null);
        }
    };

    return (
        <>
            <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h4 className="text-lg font-medium">Personas</h4>
                        <p className="text-xs text-muted-foreground">
                            Create and manage personas
                        </p>
                    </div>
                    <Button onClick={() => setIsOpen(true)}>
                        <Plus className="h-4 w-4" />
                        <span>Add persona</span>
                    </Button>
                </div>
                {listError ?? (personasStatus === 'failed' ? personasError : null) ? (
                    <p className="text-sm text-destructive" role="alert">
                        {listError ?? personasError}
                    </p>
                ) : null}
                {personasStatus === 'loading' && !hasPersonas ? (
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
                                                onClick={() => handleEdit(persona)}
                                                disabled={!persona.id}
                                                aria-label={`Edit ${persona.name}`}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() => handleDelete(persona)}
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

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setIsOpen(false)}
                            disabled={isSaving}
                        >
                            Cancel
                        </Button>
                        <Button type="button" onClick={handleSave} disabled={!canSave}>
                            {isSaving ? 'Saving...' : editingPersona ? 'Update persona' : 'Save persona'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
