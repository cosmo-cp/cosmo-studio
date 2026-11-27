'use client';

import { Badge } from '@/components/ui/badge';
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
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { usePersonaPageState } from '@/features/personas/use-persona-page-state';
import { useGetSkillsQuery } from '@/features/skills/skills-api';
import { cn } from '@/lib/utils';
import { Edit, Plus, Trash2 } from 'lucide-react';

export function PersonaList() {
    const {
        personas,
        isLoading,
        error,
        hasPersonas,
        isOpen,
        name,
        role,
        description,
        systemPrompt,
        modelIdentifier,
        temperature,
        reasoningEffort,
        skills,
        toolAccessMode,
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
        setModelIdentifier,
        setTemperature,
        setReasoningEffort,
        toggleSkill,
        setToolAccessMode,
        setWebSearchEnabled,
        handleDialogOpenChange,
        openCreateDialog,
        editPersona,
        savePersonaDraft,
        deletePersonaById,
        getErrorMessage,
    } = usePersonaPageState();

    const { data: availableSkills = [] } = useGetSkillsQuery();

    return (
        <>
            <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h4 className="text-lg font-medium">Personas</h4>
                        <p className="text-xs text-muted-foreground">
                            Create and manage virtual teammates with distinct intelligence, skills, and tools.
                        </p>
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
                                    <TableHead className="w-[180px]">Name</TableHead>
                                    <TableHead className="w-[150px]">Role</TableHead>
                                    <TableHead className="w-[180px]">Model</TableHead>
                                    <TableHead>Skills</TableHead>
                                    <TableHead className="w-[130px]">Tools</TableHead>
                                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {personas.map((persona) => (
                                    <TableRow key={persona.id ?? persona.name}>
                                        <TableCell className="font-medium">
                                            <span className="block truncate">{persona.name}</span>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-xs">
                                            {persona.role ? persona.role : 'No role'}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs text-muted-foreground">
                                            {persona.modelIdentifier ? persona.modelIdentifier : 'Chat default'}
                                        </TableCell>
                                        <TableCell>
                                            {persona.skills && persona.skills.length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {persona.skills.map((skillName) => (
                                                        <Badge
                                                            key={skillName}
                                                            variant="secondary"
                                                            className="text-xs font-mono py-0"
                                                        >
                                                            {skillName}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">None</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={persona.toolAccessMode === 'none' ? 'outline' : 'secondary'}
                                                className="text-xs"
                                            >
                                                {persona.toolAccessMode === 'all'
                                                    ? 'All tools'
                                                    : persona.toolAccessMode === 'none'
                                                      ? 'No tools'
                                                      : 'Custom tools'}
                                            </Badge>
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
                <DialogContent className="sm:max-w-[560px] max-h-[85vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>{editingPersona ? 'Edit Persona' : 'Add Persona'}</DialogTitle>
                        <DialogDescription>
                            {editingPersona
                                ? 'Update identity, intelligence, skills, and tools for this persona.'
                                : 'Configure a virtual persona with identity, model, skills, and tool access.'}
                        </DialogDescription>
                    </DialogHeader>

                    <Tabs defaultValue="identity" className="flex-1 overflow-y-auto">
                        <TabsList className="grid grid-cols-4 w-full">
                            <TabsTrigger value="identity">Identity</TabsTrigger>
                            <TabsTrigger value="intelligence">Intelligence</TabsTrigger>
                            <TabsTrigger value="skills">Skills</TabsTrigger>
                            <TabsTrigger value="tools">Tools</TabsTrigger>
                        </TabsList>

                        {/* IDENTITY TAB */}
                        <TabsContent value="identity" className="space-y-4 pt-3">
                            <div className="grid gap-2">
                                <label className="text-sm font-medium" htmlFor="persona-name">
                                    Name
                                </label>
                                <Input
                                    id="persona-name"
                                    value={name}
                                    onChange={(event) => setName(event.target.value)}
                                    placeholder="e.g. Lead Architect, Security Auditor"
                                    aria-invalid={Boolean(errorMessage)}
                                />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium" htmlFor="persona-role">
                                    Role
                                </label>
                                <Input
                                    id="persona-role"
                                    value={role}
                                    onChange={(event) => setRole(event.target.value)}
                                    placeholder="e.g. Staff Architect, AppSec Lead"
                                />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium" htmlFor="persona-description">
                                    Description
                                </label>
                                <Input
                                    id="persona-description"
                                    value={description}
                                    onChange={(event) => setDescription(event.target.value)}
                                    placeholder="Brief summary of duties and responsibilities"
                                />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium" htmlFor="persona-system-prompt">
                                    System Prompt / Instructions
                                </label>
                                <Textarea
                                    id="persona-system-prompt"
                                    value={systemPrompt}
                                    onChange={(event) => {
                                        setSystemPrompt(event.target.value);
                                        setDetails(event.target.value);
                                    }}
                                    placeholder="Detailed behavioral directives and persona system instructions..."
                                    className="max-h-36 overflow-y-auto"
                                    rows={4}
                                />
                            </div>
                        </TabsContent>

                        {/* INTELLIGENCE TAB */}
                        <TabsContent value="intelligence" className="space-y-4 pt-3">
                            <div className="grid gap-2">
                                <label className="text-sm font-medium" htmlFor="persona-model">
                                    Model Identifier
                                </label>
                                <Input
                                    id="persona-model"
                                    value={modelIdentifier ?? ''}
                                    onChange={(event) => setModelIdentifier(event.target.value || null)}
                                    placeholder="e.g. anthropic:claude-3-7-sonnet"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Designated AI model or agent runtime for this persona (blank uses chat default).
                                </p>
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium" htmlFor="persona-temperature">
                                    Temperature: {temperature ?? 0.7}
                                </label>
                                <Input
                                    id="persona-temperature"
                                    type="number"
                                    min="0"
                                    max="2"
                                    step="0.1"
                                    value={temperature ?? 0.7}
                                    onChange={(event) => setTemperature(parseFloat(event.target.value) || 0)}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Controls randomness: 0.0 is deterministic and analytical, 1.0 is creative.
                                </p>
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Reasoning Effort</label>
                                <div className="flex gap-2">
                                    {(['low', 'medium', 'high'] as const).map((effort) => (
                                        <Button
                                            key={effort}
                                            type="button"
                                            variant={reasoningEffort === effort ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() =>
                                                setReasoningEffort(reasoningEffort === effort ? null : effort)
                                            }
                                        >
                                            {effort.charAt(0).toUpperCase() + effort.slice(1)}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </TabsContent>

                        {/* SKILLS TAB */}
                        <TabsContent value="skills" className="space-y-4 pt-3">
                            <div>
                                <h5 className="font-semibold text-sm">Specialized Agent Skills</h5>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Modular skills and workflows that personas can use.
                                </p>
                            </div>
                            <div className="space-y-2 max-h-56 overflow-y-auto">
                                {availableSkills.length === 0 ? (
                                    <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                                        No skills available.
                                    </div>
                                ) : (
                                    availableSkills.map((s) => {
                                        const isSelected = skills.includes(s.name);
                                        return (
                                            <div
                                                key={s.name}
                                                onClick={() => toggleSkill(s.name)}
                                                className={cn(
                                                    'flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors',
                                                    isSelected
                                                        ? 'border-primary bg-primary/5 dark:bg-primary/10'
                                                        : 'hover:bg-muted/50 border-border',
                                                )}
                                            >
                                                <div>
                                                    <p className="text-xs font-semibold">{s.name}</p>
                                                    <p className="text-xs text-muted-foreground line-clamp-1">
                                                        {s.description || 'No description'}
                                                    </p>
                                                </div>
                                                <Badge variant={isSelected ? 'default' : 'outline'} className="text-xs">
                                                    {isSelected ? 'Equipped' : 'Add'}
                                                </Badge>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </TabsContent>

                        {/* TOOLS TAB */}
                        <TabsContent value="tools" className="space-y-4 pt-3">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Tool Access Mode</label>
                                <div className="flex gap-2">
                                    {(
                                        [
                                            { mode: 'all', label: 'All tools' },
                                            { mode: 'custom', label: 'Custom tools' },
                                            { mode: 'none', label: 'No tools' },
                                        ] as const
                                    ).map((item) => (
                                        <Button
                                            key={item.mode}
                                            type="button"
                                            variant={toolAccessMode === item.mode ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setToolAccessMode(item.mode)}
                                        >
                                            {item.label}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center justify-between rounded-lg border p-3">
                                <div className="space-y-0.5">
                                    <label htmlFor="persona-web-search" className="text-sm font-medium cursor-pointer">
                                        Exa Web Search
                                    </label>
                                    <p className="text-xs text-muted-foreground">
                                        Allow persona to perform real-time web searches.
                                    </p>
                                </div>
                                <Switch
                                    id="persona-web-search"
                                    checked={webSearchEnabled}
                                    onCheckedChange={setWebSearchEnabled}
                                />
                            </div>
                        </TabsContent>
                    </Tabs>

                    {errorMessage ? (
                        <p className="text-sm text-destructive mt-2" role="alert">
                            {errorMessage}
                        </p>
                    ) : null}

                    <DialogFooter className="gap-2 mt-4">
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
