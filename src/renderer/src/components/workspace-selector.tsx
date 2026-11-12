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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
    useCreateWorkspaceMutation,
    useGetWorkspacesQuery,
    usePickFolderMutation,
} from '@/features/workspaces/workspaces-api';
import { Check, ChevronDown, Folder, FolderPlus, Lock } from 'lucide-react';
import React, { useState } from 'react';

export interface WorkspaceSelectorProps {
    value?: string | null;
    onChange?: (workspaceId: string | null) => void;
    locked?: boolean;
    lockedReason?: string;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    allowNone?: boolean;
    'aria-label'?: string;
}

export function WorkspaceSelector({
    value,
    onChange,
    locked = false,
    lockedReason = 'Workspace is fixed for this conversation.',
    placeholder = 'Select Workspace',
    className,
    disabled = false,
    allowNone = false,
    'aria-label': ariaLabel,
}: WorkspaceSelectorProps) {
    const { data: workspaces = [] } = useGetWorkspacesQuery();
    const [createWorkspace, { isLoading: isCreating }] = useCreateWorkspaceMutation();
    const [pickFolder, { isLoading: isPicking }] = usePickFolderMutation();

    const [menuOpen, setMenuOpen] = useState(false);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [newPath, setNewPath] = useState('');
    const [newName, setNewName] = useState('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const activeWorkspace = workspaces.find((w) => w.id === value);

    const handlePickFolder = async () => {
        setErrorMsg(null);
        const res = await pickFolder(undefined as void);
        if ('data' in res && res.data) {
            setNewPath(res.data);
            if (!newName.trim()) {
                const parts = res.data.split(/[/\\]/);
                const last = parts[parts.length - 1];
                if (last) setNewName(last);
            }
        }
    };

    const handleCreateWorkspace = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        if (!newPath.trim()) {
            setErrorMsg('Workspace path is required.');
            return;
        }

        const res = await createWorkspace({
            path: newPath.trim(),
            name: newName.trim() || undefined,
        });

        if ('error' in res && res.error) {
            setErrorMsg(res.error);
            return;
        }

        if ('data' in res && res.data) {
            onChange?.(res.data.id);
            setIsAddDialogOpen(false);
            setNewPath('');
            setNewName('');
        }
    };

    if (locked) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            disabled
                            aria-label={
                                ariaLabel ||
                                (activeWorkspace?.name ? `Workspace: ${activeWorkspace.name}` : placeholder)
                            }
                            className={`h-9 px-3 flex items-center gap-2 border border-border/40 bg-muted/40 text-muted-foreground cursor-not-allowed opacity-80 ${
                                className ?? ''
                            }`}
                        >
                            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs font-medium max-w-[140px] truncate">
                                {activeWorkspace?.name || placeholder}
                            </span>
                            <Badge variant="outline" className="h-4 px-1 text-[9px] uppercase tracking-wider">
                                Locked
                            </Badge>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="center">
                        <p className="text-xs">{lockedReason}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    return (
        <>
            <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        disabled={disabled}
                        aria-label={
                            ariaLabel || (activeWorkspace?.name ? `Workspace: ${activeWorkspace.name}` : placeholder)
                        }
                        className={`h-9 px-3 flex items-center gap-2 border border-border/40 bg-background/50 hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-all duration-200 ${
                            className ?? ''
                        }`}
                    >
                        <Folder className="h-4 w-4 text-primary" />
                        <span className="text-xs font-medium max-w-[150px] truncate">
                            {activeWorkspace?.name || placeholder}
                        </span>
                        <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="start" className="w-[280px]">
                    <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Workspaces
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    {allowNone && (
                        <DropdownMenuItem
                            onClick={() => {
                                onChange?.(null);
                                setMenuOpen(false);
                            }}
                            className="flex items-center justify-between text-xs py-2 cursor-pointer"
                        >
                            <span className="italic text-muted-foreground">No Workspace</span>
                            {!value && <Check className="h-3.5 w-3.5 text-primary" />}
                        </DropdownMenuItem>
                    )}

                    {workspaces.map((ws) => (
                        <DropdownMenuItem
                            key={ws.id}
                            onClick={() => {
                                onChange?.(ws.id);
                                setMenuOpen(false);
                            }}
                            className="flex items-center justify-between text-xs py-2 cursor-pointer"
                        >
                            <div className="flex flex-col min-w-0 pr-2">
                                <span className="font-medium truncate">{ws.name}</span>
                                <span className="text-[10px] text-muted-foreground truncate">{ws.canonicalPath}</span>
                            </div>
                            {ws.id === value && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                        </DropdownMenuItem>
                    ))}

                    {workspaces.length === 0 && !allowNone && (
                        <div className="p-3 text-center text-xs text-muted-foreground">No workspaces added yet.</div>
                    )}

                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onClick={() => {
                            setMenuOpen(false);
                            setErrorMsg(null);
                            setNewPath('');
                            setNewName('');
                            setIsAddDialogOpen(true);
                        }}
                        className="flex items-center gap-2 text-xs py-2 cursor-pointer text-primary focus:text-primary"
                    >
                        <FolderPlus className="h-4 w-4" />
                        <span>Add Folder...</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <form onSubmit={handleCreateWorkspace}>
                        <DialogHeader>
                            <DialogTitle>Add Workspace</DialogTitle>
                            <DialogDescription>
                                Register a project folder on your local filesystem to use across Chat and Tasks.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-4 py-4">
                            <div className="space-y-1.5">
                                <label htmlFor="ws-path" className="text-xs font-medium">
                                    Folder Path <span className="text-destructive">*</span>
                                </label>
                                <div className="flex gap-2">
                                    <Input
                                        id="ws-path"
                                        placeholder="/path/to/project or ~/project"
                                        value={newPath}
                                        onChange={(e) => setNewPath(e.target.value)}
                                        className="text-xs flex-1"
                                        required
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handlePickFolder}
                                        disabled={isPicking}
                                        className="text-xs shrink-0"
                                    >
                                        Browse...
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label htmlFor="ws-name" className="text-xs font-medium">
                                    Display Name <span className="text-muted-foreground">(optional)</span>
                                </label>
                                <Input
                                    id="ws-name"
                                    placeholder="Leave empty to use folder name"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className="text-xs"
                                />
                            </div>

                            {errorMsg && <p className="text-xs text-destructive font-medium">{errorMsg}</p>}
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" size="sm" disabled={isCreating || !newPath.trim()}>
                                {isCreating ? 'Adding...' : 'Add Workspace'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
