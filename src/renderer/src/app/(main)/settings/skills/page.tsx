'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useGetSkillsQuery } from '@/features/skills/skills-api';
import type { SkillManifest } from 'core/dto';
import { BookOpen, Code, FolderCode, Info, Sparkles, Terminal } from 'lucide-react';
import { useState } from 'react';

export default function SkillsSettingsPage() {
    const { data: skills = [], isLoading, error } = useGetSkillsQuery();
    const [selectedSkill, setSelectedSkill] = useState<SkillManifest | null>(null);

    return (
        <div className="flex h-full w-full flex-col overflow-y-auto p-4 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h3 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-amber-500" />
                        Skills Management
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Modular agent capabilities, architectural guidelines, and workflows that personas can possess.
                    </p>
                </div>
            </div>

            {/* Explanatory banner */}
            <div className="rounded-lg border bg-blue-50/50 dark:bg-blue-950/20 p-4 border-blue-200 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-3">
                <Info className="h-4 w-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
                <div className="space-y-1">
                    <p className="font-semibold">How Skills Work</p>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                        Skills are defined by placing a standard{' '}
                        <code className="font-mono bg-blue-100/60 dark:bg-blue-900/60 px-1 py-0.5 rounded">
                            SKILL.md
                        </code>{' '}
                        manifest in your project’s{' '}
                        <code className="font-mono bg-blue-100/60 dark:bg-blue-900/60 px-1 py-0.5 rounded">
                            ./skills/
                        </code>{' '}
                        folder. Attach them to any persona in{' '}
                        <strong className="text-foreground">Settings &gt; Persona &gt; Skill Set</strong>.
                    </p>
                </div>
            </div>

            {isLoading ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                    Scanning directories for skills...
                </div>
            ) : error ? (
                <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-xs text-destructive">
                    Failed to load skills.
                </div>
            ) : skills.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-xs text-muted-foreground space-y-2">
                    <p className="font-medium text-foreground">No Skills Found</p>
                    <p>
                        Add a skill folder with a <code className="font-mono">SKILL.md</code> file in{' '}
                        <code className="font-mono">./skills/</code> to equip your personas.
                    </p>
                </div>
            ) : (
                <div className="grid gap-3.5 sm:grid-cols-2">
                    {skills.map((skill) => (
                        <div
                            key={skill.name}
                            className="rounded-lg border bg-card p-4 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between space-y-3"
                        >
                            <div className="space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <div className="h-7 w-7 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                                            <Sparkles className="h-4 w-4" />
                                        </div>
                                        <h4 className="font-semibold text-sm font-mono text-foreground">
                                            {skill.name}
                                        </h4>
                                    </div>
                                    <Badge
                                        variant={skill.isBuiltIn ? 'secondary' : 'outline'}
                                        className="text-[10px] px-1.5 py-0"
                                    >
                                        {skill.isBuiltIn ? 'Built-in System' : 'Workspace'}
                                    </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    {skill.description || 'No description provided in frontmatter.'}
                                </p>
                            </div>

                            <div className="pt-2 border-t flex items-center justify-between text-[11px] text-muted-foreground">
                                <span className="font-mono truncate max-w-[200px]" title={skill.path}>
                                    {skill.path.split('/').slice(-2).join('/')}
                                </span>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs flex items-center gap-1"
                                    onClick={() => setSelectedSkill(skill)}
                                >
                                    <BookOpen className="h-3.5 w-3.5" />
                                    <span>Inspect Manifest</span>
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Skill Instruction Viewer Dialog */}
            <Dialog open={Boolean(selectedSkill)} onOpenChange={(open) => !open && setSelectedSkill(null)}>
                <DialogContent className="sm:max-w-[650px] max-h-[85vh] flex flex-col overflow-hidden">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 font-mono">
                            <Code className="h-4 w-4 text-primary" />
                            {selectedSkill?.name}
                        </DialogTitle>
                        <DialogDescription className="text-xs">{selectedSkill?.description}</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-md font-mono">
                            <FolderCode className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                            <span className="truncate">{selectedSkill?.path}</span>
                        </div>

                        <div className="space-y-1">
                            <h5 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                <Terminal className="h-3.5 w-3.5 text-amber-500" />
                                Injected Instructions (SKILL.md)
                            </h5>
                            <pre className="rounded-lg border bg-muted/30 p-3 text-xs font-mono whitespace-pre-wrap text-foreground/90 max-h-[350px] overflow-y-auto leading-relaxed">
                                {selectedSkill?.content || 'No prompt instructions found in SKILL.md body.'}
                            </pre>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
