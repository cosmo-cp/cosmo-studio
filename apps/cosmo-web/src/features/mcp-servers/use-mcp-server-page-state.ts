'use client';

import {
    useDeleteMcpServerMutation,
    useGetMcpServersQuery,
    useLazyGetMcpServerToolsQuery,
    useSaveMcpServerMutation,
    useToggleMcpServerEnabledMutation,
    useUpdateMcpToolApprovalMutation,
} from '@/features/mcp-servers/mcp-servers-api';
import type { McpServer, McpServerCreateInput, McpToolDefinition } from 'core/dto';
import { useState, type FormEvent } from 'react';

export type TransportType = 'stdio' | 'sse' | 'http';

export const CONFIG_PLACEHOLDER: Record<TransportType, string> = {
    stdio: JSON.stringify(
        { command: 'npx', args: ['-y', '@modelcontextprotocol/server-everything'], env: {}, cwd: '' },
        null,
        2,
    ),
    sse: JSON.stringify({ url: 'http://localhost:3001/sse', headers: {} }, null, 2),
    http: JSON.stringify({ url: 'http://localhost:3001', headers: {} }, null, 2),
};

interface McpServerFormState {
    name: string;
    description: string;
    transportType: TransportType;
    configJson: string;
    enabled: boolean;
}

function buildDefaultFormState(): McpServerFormState {
    return {
        name: '',
        description: '',
        transportType: 'stdio',
        configJson: CONFIG_PLACEHOLDER.stdio,
        enabled: true,
    };
}

export function useMcpServerPageState() {
    const { data: servers = [], isLoading, error } = useGetMcpServersQuery();
    const [saveMcpServer] = useSaveMcpServerMutation();
    const [deleteMcpServer] = useDeleteMcpServerMutation();
    const [toggleMcpServerEnabled] = useToggleMcpServerEnabledMutation();
    const [loadMcpServerTools] = useLazyGetMcpServerToolsQuery();
    const [updateMcpToolApproval] = useUpdateMcpToolApprovalMutation();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingServer, setEditingServer] = useState<McpServer | null>(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; serverId: string | null }>({
        isOpen: false,
        serverId: null,
    });
    const [formState, setFormState] = useState<McpServerFormState>(buildDefaultFormState());
    const [jsonError, setJsonError] = useState<string | null>(null);
    const [expandedServerId, setExpandedServerId] = useState<string | null>(null);
    const [serverTools, setServerTools] = useState<Record<string, McpToolDefinition[]>>({});
    const [loadingToolsFor, setLoadingToolsFor] = useState<string | null>(null);

    const openCreateDialog = () => {
        setEditingServer(null);
        setFormState(buildDefaultFormState());
        setJsonError(null);
        setIsDialogOpen(true);
    };

    const closeDialog = () => {
        setIsDialogOpen(false);
        setEditingServer(null);
        setFormState(buildDefaultFormState());
        setJsonError(null);
    };

    const handleDialogOpenChange = (open: boolean) => {
        if (!open) {
            closeDialog();
            return;
        }

        setIsDialogOpen(true);
    };

    const editServer = (server: McpServer) => {
        setEditingServer(server);
        setFormState({
            name: server.name,
            description: (server.description as string) ?? '',
            transportType: server.transportType as TransportType,
            configJson: JSON.stringify(server.config, null, 2),
            enabled: server.enabled,
        });
        setJsonError(null);
        setIsDialogOpen(true);
    };

    const saveServer = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isSubmitting) {
            return;
        }

        let parsedConfig: unknown;
        try {
            parsedConfig = JSON.parse(formState.configJson);
        } catch {
            setJsonError('Invalid JSON configuration.');
            return;
        }

        if (typeof parsedConfig !== 'object' || parsedConfig === null || Array.isArray(parsedConfig)) {
            setJsonError('Configuration must be a JSON object.');
            return;
        }

        setIsSubmitting(true);
        setJsonError(null);

        const result = await saveMcpServer(
            editingServer
                ? {
                      serverId: editingServer.id,
                      input: {
                          name: formState.name.trim(),
                          description: formState.description.trim() || null,
                          transportType: formState.transportType,
                          config: parsedConfig,
                          enabled: formState.enabled,
                      } as McpServerCreateInput,
                  }
                : {
                      input: {
                          name: formState.name.trim(),
                          description: formState.description.trim() || null,
                          transportType: formState.transportType,
                          config: parsedConfig,
                          enabled: formState.enabled,
                      },
                  },
        );

        if ('data' in result) {
            closeDialog();
        }

        setIsSubmitting(false);
    };

    const requestDeleteServer = (serverId: string) => {
        setDeleteConfirmation({ isOpen: true, serverId });
    };

    const clearDeleteConfirmation = () => {
        setDeleteConfirmation({ isOpen: false, serverId: null });
    };

    const confirmDeleteServer = async () => {
        if (!deleteConfirmation.serverId) {
            return;
        }

        const serverId = deleteConfirmation.serverId;
        clearDeleteConfirmation();

        const result = await deleteMcpServer(serverId);
        if ('data' in result) {
            setServerTools((currentTools) => {
                const nextTools = { ...currentTools };
                delete nextTools[serverId];
                return nextTools;
            });

            if (expandedServerId === serverId) {
                setExpandedServerId(null);
            }
        }
    };

    const toggleServerEnabled = async (server: McpServer) => {
        await toggleMcpServerEnabled({
            serverId: server.id,
            enabled: !server.enabled,
        });
    };

    const toggleServerTools = async (serverId: string) => {
        if (expandedServerId === serverId) {
            setExpandedServerId(null);
            return;
        }

        setExpandedServerId(serverId);
        if (!serverTools[serverId]) {
            setLoadingToolsFor(serverId);
            const toolsResult = await loadMcpServerTools(serverId);
            if ('data' in toolsResult) {
                setServerTools((currentTools) => ({ ...currentTools, [serverId]: toolsResult.data ?? [] }));
            } else {
                setServerTools((currentTools) => ({ ...currentTools, [serverId]: [] }));
            }
            setLoadingToolsFor(null);
        }
    };

    const refreshServerTools = async (serverId: string) => {
        setLoadingToolsFor(serverId);
        const toolsResult = await loadMcpServerTools(serverId);
        if ('data' in toolsResult) {
            setServerTools((currentTools) => ({ ...currentTools, [serverId]: toolsResult.data ?? [] }));
        }
        setLoadingToolsFor(null);
    };

    const setTransportType = (value: string) => {
        const transportType = value as TransportType;
        setFormState((currentState) => ({
            ...currentState,
            transportType,
            configJson: Object.values(CONFIG_PLACEHOLDER).includes(currentState.configJson)
                ? CONFIG_PLACEHOLDER[transportType]
                : currentState.configJson,
        }));
    };

    const updateToolApproval = async (serverId: string, toolName: string, needsApproval: boolean) => {
        await updateMcpToolApproval({
            serverId,
            toolName,
            needsApproval,
        });
    };

    return {
        servers,
        isLoading,
        error,
        hasServers: servers.length > 0,
        isDialogOpen,
        isSubmitting,
        editingServer,
        deleteConfirmation,
        formState,
        jsonError,
        expandedServerId,
        serverTools,
        loadingToolsFor,
        setFormState,
        setTransportType,
        setJsonError,
        openCreateDialog,
        closeDialog,
        handleDialogOpenChange,
        editServer,
        saveServer,
        requestDeleteServer,
        clearDeleteConfirmation,
        confirmDeleteServer,
        toggleServerEnabled,
        toggleServerTools,
        refreshServerTools,
        updateToolApproval,
    };
}
