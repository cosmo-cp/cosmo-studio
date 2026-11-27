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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { WorkspaceSelector } from '@/components/workspace-selector';
import { useGetWorkspacesQuery } from '@/features/workspaces/workspaces-api';
import type { AcpAgentView, ProviderWithModels, TaskCreateInput } from 'core/dto';
import { Bot, Cpu, FolderGit2 } from 'lucide-react';
import React, { useState } from 'react';

interface CreateTaskDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (input: TaskCreateInput) => Promise<void>;
    isSubmitting?: boolean;
    providers: ProviderWithModels[];
    agents: AcpAgentView[];
}

export function CreateTaskDialog({
    open,
    onOpenChange,
    onSubmit,
    isSubmitting = false,
    providers,
    agents,
}: CreateTaskDialogProps) {
    const { data: workspaces = [] } = useGetWorkspacesQuery();
    const defaultProvider = providers[0]?.name ?? '';
    const defaultModelId = providers[0]?.models?.[0]?.modelId ?? '';
    const defaultAgentId = agents[0]?.id ?? '';

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [workspaceId, setWorkspaceId] = useState<string | null>(null);
    const [workspacePath, setWorkspacePath] = useState('');
    const [runtime, setRuntime] = useState<'model' | 'agent'>('model');
    const [provider, setProvider] = useState<string>(defaultProvider);
    const [modelId, setModelId] = useState<string>(defaultModelId);
    const [agentId, setAgentId] = useState<string>(defaultAgentId);

    const activeProvider = provider || defaultProvider;
    const selectedProviderObj = providers.find((p) => p.name === activeProvider);
    const activeModelId = modelId || selectedProviderObj?.models?.[0]?.modelId || '';
    const activeAgentId = agentId || defaultAgentId;

    const handleProviderChange = (newProvider: string) => {
        setProvider(newProvider);
        const provObj = providers.find((p) => p.name === newProvider);
        if (provObj?.models && provObj.models.length > 0) {
            setModelId(provObj.models[0].modelId);
        } else {
            setModelId('');
        }
    };

    const handleWorkspaceSelect = (selectedId: string | null) => {
        setWorkspaceId(selectedId);
        if (selectedId) {
            const ws = workspaces.find((w) => w.id === selectedId);
            if (ws) {
                setWorkspacePath(ws.canonicalPath);
            }
        }
    };

    const handleWorkspacePathChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setWorkspacePath(val);
        const matched = workspaces.find((w) => w.canonicalPath === val || w.rawPath === val);
        setWorkspaceId(matched ? matched.id : null);
    };

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setWorkspaceId(null);
        setWorkspacePath('');
        setRuntime('model');
        setProvider(defaultProvider);
        setModelId(defaultModelId);
        setAgentId(defaultAgentId);
    };

    const handleClose = (newOpen: boolean) => {
        if (!newOpen) {
            resetForm();
        }
        onOpenChange(newOpen);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !description.trim() || !workspacePath.trim() || isSubmitting) {
            return;
        }

        const input: TaskCreateInput = {
            title: title.trim(),
            description: description.trim(),
            workspacePath: workspacePath.trim(),
            workspaceId: workspaceId || undefined,
            runtime,
            provider: runtime === 'model' ? activeProvider || null : null,
            modelId: runtime === 'model' ? activeModelId || null : null,
            agentId: runtime === 'agent' ? activeAgentId || null : null,
        };

        await onSubmit(input);
        resetForm();
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[540px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Create New Task</DialogTitle>
                        <DialogDescription>
                            Define instructions, target workspace, and autonomous agent runtime.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4 text-xs">
                        {/* Title */}
                        <div className="space-y-1.5">
                            <label htmlFor="task-title" className="text-xs font-medium">
                                Task Title <span className="text-destructive">*</span>
                            </label>
                            <Input
                                id="task-title"
                                placeholder="e.g., Implement auth middleware"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                                className="text-xs h-9 bg-background"
                                data-testid="task-title-input"
                            />
                        </div>

                        {/* Target Workspace */}
                        <div className="space-y-1.5">
                            <label htmlFor="task-workspace" className="text-xs font-medium">
                                Target Workspace <span className="text-destructive">*</span>
                            </label>
                            <div className="flex flex-col gap-2">
                                <WorkspaceSelector
                                    value={workspaceId}
                                    onChange={handleWorkspaceSelect}
                                    className="w-full justify-between h-9"
                                    placeholder="Select registered workspace..."
                                    allowNone={true}
                                />
                                <div className="relative">
                                    <FolderGit2 className="absolute left-2.5 top-2.5 size-4 text-muted-foreground pointer-events-none" />
                                    <Input
                                        id="task-workspace"
                                        placeholder="/Users/username/projects/my-app"
                                        value={workspacePath}
                                        onChange={handleWorkspacePathChange}
                                        required
                                        className="text-xs h-9 pl-8 bg-background font-mono"
                                        data-testid="task-workspace-input"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Runtime Mode Selector */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium">Execution Engine</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setRuntime('model')}
                                    className={`p-2.5 rounded-lg border text-left flex items-start gap-2.5 cursor-pointer transition-colors ${
                                        runtime === 'model'
                                            ? 'border-primary bg-primary/10 text-primary font-medium'
                                            : 'border-border bg-background hover:bg-muted text-foreground'
                                    }`}
                                >
                                    <Cpu className="size-4 mt-0.5" />
                                    <div>
                                        <div className="font-medium">Direct AI SDK</div>
                                        <div className="text-[11px] text-muted-foreground font-normal">
                                            Vercel AI SDK Model
                                        </div>
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setRuntime('agent')}
                                    className={`p-2.5 rounded-lg border text-left flex items-start gap-2.5 cursor-pointer transition-colors ${
                                        runtime === 'agent'
                                            ? 'border-primary bg-primary/10 text-primary font-medium'
                                            : 'border-border bg-background hover:bg-muted text-foreground'
                                    }`}
                                >
                                    <Bot className="size-4 mt-0.5" />
                                    <div>
                                        <div className="font-medium">ACP Coding Agent</div>
                                        <div className="text-[11px] text-muted-foreground font-normal">
                                            Autonomous agent process
                                        </div>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Runtime-specific Model or Agent dropdown */}
                        {runtime === 'model' ? (
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium">Provider</label>
                                    <Select value={activeProvider} onValueChange={handleProviderChange}>
                                        <SelectTrigger className="w-full text-xs h-9">
                                            <SelectValue placeholder="Select Provider" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {providers.map((p) => (
                                                <SelectItem key={p.id} value={p.name} className="text-xs">
                                                    {p.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium">Model ID</label>
                                    <Select value={activeModelId} onValueChange={setModelId}>
                                        <SelectTrigger className="w-full text-xs h-9">
                                            <SelectValue placeholder="Select Model" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {selectedProviderObj?.models?.map(
                                                (m: { id: string; name: string; modelId: string }) => (
                                                    <SelectItem
                                                        key={m.id}
                                                        value={m.modelId}
                                                        className="text-xs font-mono"
                                                    >
                                                        {m.name || m.modelId}
                                                    </SelectItem>
                                                ),
                                            ) || (
                                                <SelectItem value="default" className="text-xs">
                                                    Default
                                                </SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium">ACP Registered Agent</label>
                                <Select value={activeAgentId} onValueChange={setAgentId}>
                                    <SelectTrigger className="w-full text-xs h-9">
                                        <SelectValue placeholder="Select Agent" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {agents.length === 0 ? (
                                            <SelectItem value="none" disabled className="text-xs">
                                                No ACP agents registered
                                            </SelectItem>
                                        ) : (
                                            agents.map((a) => (
                                                <SelectItem key={a.id} value={a.id} className="text-xs">
                                                    {a.name} ({a.command})
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Description Instructions */}
                        <div className="space-y-1.5">
                            <label htmlFor="task-description" className="text-xs font-medium">
                                Task Instructions & Criteria <span className="text-destructive">*</span>
                            </label>
                            <Textarea
                                id="task-description"
                                placeholder="Explain what the AI agent should achieve, acceptance tests to run, files to inspect..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                required
                                className="min-h-24 text-xs resize-y bg-background"
                                data-testid="task-description-input"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="text-xs h-8"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={!title.trim() || !description.trim() || !workspacePath.trim() || isSubmitting}
                            className="text-xs h-8"
                            data-testid="submit-create-task"
                        >
                            {isSubmitting ? 'Creating...' : 'Create Task'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
