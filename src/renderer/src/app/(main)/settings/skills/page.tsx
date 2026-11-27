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
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useDeleteSkillMutation, useGetSkillsQuery, useUploadSkillMutation } from '@/features/skills/skills-api';
import type { SkillManifest } from 'core/dto';
import { BookOpen, Code, Sparkles, Terminal, Trash2, Upload } from 'lucide-react';
import { useState } from 'react';

export default function SkillsSettingsPage() {
    const { data: skills = [], isLoading, error } = useGetSkillsQuery();
    const [uploadSkill] = useUploadSkillMutation();
    const [deleteSkill] = useDeleteSkillMutation();

    const [selectedSkill, setSelectedSkill] = useState<SkillManifest | null>(null);
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [uploadName, setUploadName] = useState('');
    const [uploadMode, setUploadMode] = useState<'file' | 'text'>('file');
    const [pastedContent, setPastedContent] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            if (!uploadName) {
                const baseName = file.name.replace(/\.(zip|md)$/i, '');
                setUploadName(baseName);
            }
        }
    };

    const handleUploadSubmit = async () => {
        setIsSubmitting(true);
        try {
            if (uploadMode === 'file' && selectedFile) {
                const isZip = selectedFile.name.endsWith('.zip');
                if (isZip) {
                    const arrayBuffer = await selectedFile.arrayBuffer();
                    const uint8 = new Uint8Array(arrayBuffer);
                    let binary = '';
                    for (let i = 0; i < uint8.length; i++) {
                        binary += String.fromCharCode(uint8[i]);
                    }
                    const base64 = btoa(binary);
                    await uploadSkill({
                        name: uploadName || undefined,
                        archiveBase64: base64,
                    });
                } else {
                    const text = await selectedFile.text();
                    await uploadSkill({
                        name: uploadName || undefined,
                        content: text,
                    });
                }
            } else if (uploadMode === 'text' && pastedContent.trim()) {
                await uploadSkill({
                    name: uploadName || undefined,
                    content: pastedContent.trim(),
                });
            }

            setIsUploadOpen(false);
            setUploadName('');
            setPastedContent('');
            setSelectedFile(null);
        } catch {
            // Error is handled by mutation toast
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (skillName: string) => {
        if (window.confirm(`Are you sure you want to delete the skill "${skillName}"?`)) {
            await deleteSkill(skillName);
        }
    };

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
                <Button type="button" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setIsUploadOpen(true)}>
                    <Upload className="h-3.5 w-3.5" />
                    Upload Skill
                </Button>
            </div>

            {isLoading ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                    Loading skills...
                </div>
            ) : error ? (
                <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-xs text-destructive">
                    Failed to load skills.
                </div>
            ) : skills.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-xs text-muted-foreground space-y-2">
                    <p className="font-medium text-foreground">No Skills Found</p>
                    <p>Upload a skill package (.zip or SKILL.md) to add capabilities to your personas.</p>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2 text-xs"
                        onClick={() => setIsUploadOpen(true)}
                    >
                        <Upload className="h-3.5 w-3.5 mr-1" />
                        Upload Skill
                    </Button>
                </div>
            ) : (
                <div className="rounded-md border overflow-hidden">
                    <Table className="table-fixed w-full">
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[180px]">Name</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="w-[125px] hidden sm:table-cell">Type</TableHead>
                                <TableHead className="w-[180px] text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {skills.map((skill) => (
                                <TableRow key={skill.name}>
                                    <TableCell className="font-medium overflow-hidden">
                                        <span className="block font-mono text-sm truncate" title={skill.name}>
                                            {skill.name}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground max-w-0 overflow-hidden">
                                        <p
                                            className="truncate"
                                            title={skill.description || 'No description provided in frontmatter.'}
                                        >
                                            {skill.description || 'No description provided in frontmatter.'}
                                        </p>
                                    </TableCell>
                                    <TableCell className="hidden sm:table-cell">
                                        <Badge
                                            variant={skill.isBuiltIn ? 'secondary' : 'outline'}
                                            className="text-[10px] px-1.5 py-0"
                                        >
                                            {skill.isBuiltIn ? 'Built-in System' : 'Custom'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1.5">
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
                                            {!skill.isBuiltIn && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                    title="Delete skill"
                                                    aria-label={`Delete ${skill.name}`}
                                                    onClick={() => handleDelete(skill.name)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
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

            {/* Upload Skill Dialog */}
            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                <DialogContent className="sm:max-w-[540px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Upload className="h-4 w-4 text-primary" />
                            Upload Skill
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Upload a .zip package or a SKILL.md manifest to equip your personas with new capabilities.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="skill-upload-name" className="text-xs">
                                Skill Name (optional)
                            </Label>
                            <Input
                                id="skill-upload-name"
                                placeholder="e.g. code-reviewer"
                                value={uploadName}
                                onChange={(e) => setUploadName(e.target.value)}
                            />
                            <p className="text-[11px] text-muted-foreground">
                                Leave blank to use the name defined in the SKILL.md frontmatter.
                            </p>
                        </div>

                        <div className="flex items-center gap-2 text-xs">
                            <Button
                                type="button"
                                variant={uploadMode === 'file' ? 'default' : 'outline'}
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => setUploadMode('file')}
                            >
                                Archive / File (.zip, .md)
                            </Button>
                            <Button
                                type="button"
                                variant={uploadMode === 'text' ? 'default' : 'outline'}
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => setUploadMode('text')}
                            >
                                Paste SKILL.md
                            </Button>
                        </div>

                        {uploadMode === 'file' ? (
                            <div className="space-y-1.5">
                                <Label htmlFor="skill-file-input" className="text-xs">
                                    Select File
                                </Label>
                                <Input
                                    id="skill-file-input"
                                    type="file"
                                    accept=".zip,.md"
                                    onChange={handleFileChange}
                                />
                                {selectedFile && (
                                    <p className="text-[11px] text-muted-foreground font-mono">
                                        Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                <Label htmlFor="skill-paste-content" className="text-xs">
                                    SKILL.md Markdown Content
                                </Label>
                                <Textarea
                                    id="skill-paste-content"
                                    rows={8}
                                    placeholder={
                                        '---\nname: my-skill\ndescription: A helpful skill\n---\n# Instructions\n...'
                                    }
                                    value={pastedContent}
                                    onChange={(e) => setPastedContent(e.target.value)}
                                    className="font-mono text-xs"
                                />
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsUploadOpen(false)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={handleUploadSubmit}
                            disabled={
                                isSubmitting ||
                                (uploadMode === 'file' && !selectedFile) ||
                                (uploadMode === 'text' && !pastedContent.trim())
                            }
                        >
                            {isSubmitting ? 'Uploading...' : 'Upload & Install'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
