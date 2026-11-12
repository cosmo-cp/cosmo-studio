'use client';

import {
    useCheckAllReachabilityMutation,
    useCheckReachabilityMutation,
    useCreateWorkspaceMutation,
    useDeleteWorkspaceMutation,
    useGetWorkspacesQuery,
    usePickFolderMutation,
    useUpdateWorkspaceMutation,
} from '@/features/workspaces/workspaces-api';
import type { Workspace, WorkspaceReachabilityResult } from 'core/dto';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export function useWorkspacePageState() {
    const { data: workspaces = [], isLoading, error } = useGetWorkspacesQuery();
    const [createWorkspace, { isLoading: isCreating }] = useCreateWorkspaceMutation();
    const [updateWorkspace, { isLoading: isUpdating }] = useUpdateWorkspaceMutation();
    const [deleteWorkspace, { isLoading: isDeleting }] = useDeleteWorkspaceMutation();
    const [pickFolder, { isLoading: isPickingFolder }] = usePickFolderMutation();
    const [checkReachability] = useCheckReachabilityMutation();
    const [checkAllReachability] = useCheckAllReachabilityMutation();

    const checkAllRef = useRef(checkAllReachability);
    const checkSingleRef = useRef(checkReachability);

    useEffect(() => {
        checkAllRef.current = checkAllReachability;
    }, [checkAllReachability]);

    useEffect(() => {
        checkSingleRef.current = checkReachability;
    }, [checkReachability]);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);
    const [deletingWorkspace, setDeletingWorkspace] = useState<Workspace | null>(null);

    const [name, setName] = useState('');
    const [path, setPath] = useState('');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [copiedWorkspaceId, setCopiedWorkspaceId] = useState<string | null>(null);

    const [reachabilityMap, setReachabilityMap] = useState<Record<string, WorkspaceReachabilityResult>>({});
    const [isCheckingMap, setIsCheckingMap] = useState<Record<string, boolean>>({});
    const [isCheckingAll, setIsCheckingAll] = useState(false);

    const isSaving = isCreating || isUpdating;

    const resetForm = useCallback(() => {
        setName('');
        setPath('');
        setErrorMessage(null);
        setEditingWorkspace(null);
    }, []);

    const openCreateDialog = useCallback(() => {
        resetForm();
        setIsDialogOpen(true);
    }, [resetForm]);

    const openEditDialog = useCallback((ws: Workspace) => {
        setEditingWorkspace(ws);
        setName(ws.name);
        setPath(ws.canonicalPath);
        setErrorMessage(null);
        setIsDialogOpen(true);
    }, []);

    const closeDialog = useCallback(() => {
        setIsDialogOpen(false);
        resetForm();
    }, [resetForm]);

    const openDeleteDialog = useCallback((ws: Workspace) => {
        setDeletingWorkspace(ws);
    }, []);

    const closeDeleteDialog = useCallback(() => {
        setDeletingWorkspace(null);
    }, []);

    const handlePickFolder = useCallback(async () => {
        setErrorMessage(null);
        const res = await pickFolder(undefined as void);
        if ('data' in res && res.data) {
            setPath(res.data);
            if (!name.trim()) {
                const parts = res.data.split(/[/\\]/);
                const last = parts[parts.length - 1];
                if (last) setName(last);
            }
        }
    }, [name, pickFolder]);

    const handleCopyPath = useCallback(async (ws: Workspace) => {
        try {
            await navigator.clipboard.writeText(ws.canonicalPath);
            setCopiedWorkspaceId(ws.id);
            setTimeout(() => {
                setCopiedWorkspaceId((prev) => (prev === ws.id ? null : prev));
            }, 2000);
        } catch {
            // ignore clipboard error
        }
    }, []);

    const canSave = useMemo(() => {
        return path.trim().length > 0 && !isSaving;
    }, [path, isSaving]);

    const saveWorkspace = useCallback(async () => {
        setErrorMessage(null);
        if (!path.trim()) {
            setErrorMessage('Folder path is required.');
            return;
        }

        if (editingWorkspace) {
            const res = await updateWorkspace({
                id: editingWorkspace.id,
                input: {
                    name: name.trim() || undefined,
                    path: path.trim() || undefined,
                },
            });
            if ('error' in res && res.error) {
                setErrorMessage(res.error);
                return;
            }
            if ('data' in res && res.data) {
                closeDialog();
            }
        } else {
            const res = await createWorkspace({
                name: name.trim() || undefined,
                path: path.trim(),
            });
            if ('error' in res && res.error) {
                setErrorMessage(res.error);
                return;
            }
            if ('data' in res && res.data) {
                closeDialog();
            }
        }
    }, [closeDialog, createWorkspace, editingWorkspace, name, path, updateWorkspace]);

    const confirmDelete = useCallback(async () => {
        if (!deletingWorkspace) return;
        const res = await deleteWorkspace(deletingWorkspace.id);
        if ('data' in res && res.data) {
            closeDeleteDialog();
        }
    }, [closeDeleteDialog, deleteWorkspace, deletingWorkspace]);

    const refreshAllStatuses = useCallback(async () => {
        setIsCheckingAll(true);
        try {
            const res = await checkAllRef.current(undefined as void);
            if ('data' in res && res.data) {
                setReachabilityMap(res.data);
            }
        } finally {
            setIsCheckingAll(false);
        }
    }, []);

    const refreshWorkspaceStatus = useCallback(async (id: string) => {
        setIsCheckingMap((prev) => ({ ...prev, [id]: true }));
        try {
            const res = await checkSingleRef.current(id);
            if ('data' in res && res.data) {
                setReachabilityMap((prev) => ({ ...prev, [id]: res.data }));
            }
        } finally {
            setIsCheckingMap((prev) => ({ ...prev, [id]: false }));
        }
    }, []);

    const checkedWorkspacesKeyRef = useRef<string>('');

    useEffect(() => {
        const key = workspaces
            .map((w) => w.id)
            .sort()
            .join(',');
        if (key && key !== checkedWorkspacesKeyRef.current) {
            checkedWorkspacesKeyRef.current = key;
            void checkAllRef.current(undefined as void).then((res) => {
                if ('data' in res && res.data) {
                    setReachabilityMap(res.data);
                }
            });
        }
    }, [workspaces]);

    return {
        workspaces,
        isLoading,
        error,
        isDialogOpen,
        editingWorkspace,
        deletingWorkspace,
        isDeleteDialogOpen: Boolean(deletingWorkspace),
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
    };
}
