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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useWorkspacePageState } from '@/features/workspaces/use-workspace-page-state';
import { AlertCircle, Check, Copy, Edit, Folder, FolderGit2, Loader2, Plus, RotateCw, Trash2 } from 'lucide-react';
import React from 'react';

export function WorkspaceManagement() {
    const {
        workspaces,
        isLoading,
        error,
        isDialogOpen,
        editingWorkspace,
        deletingWorkspace,
        isDeleteDialogOpen,
        name,
        setName,
        path,
        setPath,
        errorMessage,
        isSaving,
        isDeleting,
        isPickingFolder,
        copiedWorkspaceId,
        canSave,
        reachabilityMap,
        isCheckingAll,
        isCheckingMap,
        openCreateDialog,
        openEditDialog,
        closeDialog,
        openDeleteDialog,
        closeDeleteDialog,
        handlePickFolder,
        handleCopyPath,
        saveWorkspace,
        confirmDelete,
        refreshAllStatuses,
        refreshWorkspaceStatus,
    } = useWorkspacePageState();

    return (
        <TooltipProvider>
            <div className="flex min-h-0 flex-1 flex-col gap-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h2 className="text-lg font-medium">Workspaces</h2>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Manage registered project folders on your filesystem for Chat and Tasks.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                        <Button
                            onClick={refreshAllStatuses}
                            variant="outline"
                            size="sm"
                            disabled={isCheckingAll}
                            className="gap-1.5"
                        >
                            <RotateCw className={`size-3.5 ${isCheckingAll ? 'animate-spin' : ''}`} />
                            <span>Refresh Status</span>
                        </Button>
                        <Button onClick={openCreateDialog} size="sm" className="gap-1.5">
                            <Plus className="size-4" />
                            <span>Add Workspace</span>
                        </Button>
                    </div>
                </div>

                <div className="min-h-0 flex-1 overflow-auto">
                    {error ? (
                        <div className="mb-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                            {typeof error === 'string' && error.trim().length > 0
                                ? error
                                : (error as unknown) instanceof Error
                                  ? (error as unknown as Error).message
                                  : 'Failed to load workspaces.'}
                        </div>
                    ) : null}

                    {isLoading && workspaces.length === 0 ? (
                        <div className="flex items-center justify-center p-12 text-sm text-muted-foreground">
                            <Loader2 className="mr-2 size-4 animate-spin" />
                            Loading workspaces...
                        </div>
                    ) : workspaces.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
                            <FolderGit2 className="mb-3 size-10 text-muted-foreground/60" />
                            <h3 className="text-sm font-semibold">No workspaces registered</h3>
                            <p className="mt-1 text-xs text-muted-foreground max-w-sm">
                                Register local project repositories to allow ACP coding agents and autonomous tasks to
                                execute tools in your codebases.
                            </p>
                            <Button onClick={openCreateDialog} variant="outline" size="sm" className="mt-4 gap-1.5">
                                <Plus className="size-4" />
                                <span>Add Your First Workspace</span>
                            </Button>
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[180px]">Workspace</TableHead>
                                        <TableHead className="w-[110px]">Status</TableHead>
                                        <TableHead>Directory Path</TableHead>
                                        <TableHead className="w-[120px]">Registered</TableHead>
                                        <TableHead className="w-[130px] text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {workspaces.map((ws) => (
                                        <TableRow key={ws.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <Folder className="size-4 text-primary shrink-0" />
                                                    <span className="truncate">{ws.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {reachabilityMap[ws.id] ? (
                                                    reachabilityMap[ws.id].reachable ? (
                                                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                                                            <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                                                            <span className="text-[11px]">Ready</span>
                                                        </span>
                                                    ) : (
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <span
                                                                    className="inline-flex items-center gap-1.5 text-xs text-destructive font-medium cursor-help"
                                                                    data-testid={`workspace-error-${ws.id}`}
                                                                >
                                                                    <AlertCircle className="size-3.5 text-destructive shrink-0" />
                                                                    <span className="text-[11px]">Unavailable</span>
                                                                </span>
                                                            </TooltipTrigger>
                                                            <TooltipContent side="top" className="max-w-xs">
                                                                <p className="text-xs font-semibold text-destructive">
                                                                    Folder unavailable
                                                                </p>
                                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                                    {reachabilityMap[ws.id].error ??
                                                                        'This folder does not exist or is inaccessible on disk.'}
                                                                </p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    )
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/60">
                                                        <span className="size-2 rounded-full bg-muted-foreground/40 shrink-0" />
                                                        <span className="text-[11px]">Checking...</span>
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 group">
                                                    <code className="text-xs font-mono text-muted-foreground truncate max-w-[420px]">
                                                        {ws.canonicalPath}
                                                    </code>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon-sm"
                                                                className="opacity-0 group-hover:opacity-100 transition-opacity size-6"
                                                                onClick={() => handleCopyPath(ws)}
                                                                aria-label={`Copy path for ${ws.name}`}
                                                            >
                                                                {copiedWorkspaceId === ws.id ? (
                                                                    <Check className="size-3 text-green-500" />
                                                                ) : (
                                                                    <Copy className="size-3 text-muted-foreground" />
                                                                )}
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top">
                                                            <p className="text-xs">
                                                                {copiedWorkspaceId === ws.id ? 'Copied!' : 'Copy path'}
                                                            </p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {new Date(ws.createdAt).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon-sm"
                                                                onClick={() => refreshWorkspaceStatus(ws.id)}
                                                                disabled={isCheckingMap[ws.id]}
                                                                aria-label={`Refresh status for ${ws.name}`}
                                                            >
                                                                <RotateCw
                                                                    className={`size-4 ${
                                                                        isCheckingMap[ws.id] ? 'animate-spin' : ''
                                                                    }`}
                                                                />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top">
                                                            <p className="text-xs">Refresh folder status</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        onClick={() => openEditDialog(ws)}
                                                        aria-label={`Edit ${ws.name}`}
                                                    >
                                                        <Edit className="size-4" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        onClick={() => openDeleteDialog(ws)}
                                                        className="text-destructive hover:text-destructive"
                                                        aria-label={`Delete ${ws.name}`}
                                                    >
                                                        <Trash2 className="size-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>

                {/* Create / Edit Workspace Dialog */}
                <Dialog open={isDialogOpen} onOpenChange={(open) => !open && closeDialog()}>
                    <DialogContent className="sm:max-w-[480px]">
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                void saveWorkspace();
                            }}
                        >
                            <DialogHeader>
                                <DialogTitle>{editingWorkspace ? 'Edit Workspace' : 'Add Workspace'}</DialogTitle>
                                <DialogDescription>
                                    {editingWorkspace
                                        ? 'Update the workspace display name or directory path.'
                                        : 'Register a local project directory for ACP agents and autonomous tasks.'}
                                </DialogDescription>
                            </DialogHeader>

                            <div className="grid gap-4 py-4">
                                <div className="space-y-1.5">
                                    <label htmlFor="workspace-path" className="text-xs font-medium">
                                        Directory Path <span className="text-destructive">*</span>
                                    </label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="workspace-path"
                                            placeholder="/path/to/project or ~/project"
                                            value={path}
                                            onChange={(e) => setPath(e.target.value)}
                                            className="text-xs flex-1 font-mono"
                                            required
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={handlePickFolder}
                                            disabled={isPickingFolder}
                                            className="text-xs shrink-0"
                                        >
                                            Browse...
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label htmlFor="workspace-name" className="text-xs font-medium">
                                        Display Name <span className="text-muted-foreground">(optional)</span>
                                    </label>
                                    <Input
                                        id="workspace-name"
                                        placeholder="Leave empty to use folder name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="text-xs"
                                    />
                                </div>

                                {errorMessage && (
                                    <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                                        {errorMessage}
                                    </div>
                                )}
                            </div>

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={closeDialog}
                                    disabled={isSaving}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" size="sm" disabled={!canSave}>
                                    {isSaving ? 'Saving...' : editingWorkspace ? 'Update' : 'Add Workspace'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Delete Confirmation Dialog */}
                <Dialog open={isDeleteDialogOpen} onOpenChange={(open) => !open && closeDeleteDialog()}>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Delete Workspace</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to remove{' '}
                                <span className="font-semibold text-foreground">{deletingWorkspace?.name}</span>?
                                Existing chats and task records will retain their recorded paths, but this workspace
                                reference will be removed.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={closeDeleteDialog}
                                disabled={isDeleting}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={confirmDelete}
                                disabled={isDeleting}
                            >
                                {isDeleting ? 'Deleting...' : 'Delete Workspace'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </TooltipProvider>
    );
}
