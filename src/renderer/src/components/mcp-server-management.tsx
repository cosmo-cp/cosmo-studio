'use client';

import { ConfirmDialog } from '@/components/confirm-dialog';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import type { McpServer, McpServerCreateInput, McpServerUpdateInput } from 'core/dto';
import { ChevronDown, ChevronRight, Edit, Plus, RefreshCw, Trash2, Wrench } from 'lucide-react';
import { Fragment, useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

type TransportType = 'stdio' | 'sse' | 'http';

interface McpTool {
    name: string;
    title?: string;
    description?: string;
}

const CONFIG_PLACEHOLDER: Record<TransportType, string> = {
    stdio: JSON.stringify(
        { command: 'npx', args: ['-y', '@modelcontextprotocol/server-everything'], env: {}, cwd: '' },
        null,
        2,
    ),
    sse: JSON.stringify({ url: 'http://localhost:3001/sse', headers: {} }, null, 2),
    http: JSON.stringify({ url: 'http://localhost:3001', headers: {} }, null, 2),
};

const buildDefaultFormState = () => ({
    name: '',
    description: '',
    transportType: 'stdio' as TransportType,
    configJson: CONFIG_PLACEHOLDER['stdio'],
    enabled: true,
});

export function McpServerManagement() {
    const [servers, setServers] = useState<McpServer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingServer, setEditingServer] = useState<McpServer | null>(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; serverId: string | null }>({
        isOpen: false,
        serverId: null,
    });
    const [formState, setFormState] = useState(buildDefaultFormState());
    const [jsonError, setJsonError] = useState<string | null>(null);

    // Tool listing per server
    const [expandedServerId, setExpandedServerId] = useState<string | null>(null);
    const [serverTools, setServerTools] = useState<Record<string, McpTool[]>>({});
    const [loadingToolsFor, setLoadingToolsFor] = useState<string | null>(null);

    const loadServers = useCallback(async () => {
        try {
            const list = await window.api.mcpServer.getAll();
            setServers(list);
        } catch (error) {
            console.error('Failed to load MCP servers', error);
            toast.error('Failed to load MCP servers');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadServers();
    }, [loadServers]);

    const handleOpenDialog = () => {
        setEditingServer(null);
        setFormState(buildDefaultFormState());
        setJsonError(null);
        setIsDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setIsDialogOpen(false);
        setEditingServer(null);
        setFormState(buildDefaultFormState());
        setJsonError(null);
    };

    const handleEdit = (server: McpServer) => {
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

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (isSubmitting) return;

        // Validate JSON
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

        try {
            if (editingServer) {
                const updates: McpServerUpdateInput = {
                    name: formState.name.trim(),
                    description: formState.description.trim() || null,
                    transportType: formState.transportType,
                    config: parsedConfig,
                    enabled: formState.enabled,
                };
                const updated = await window.api.mcpServer.update(editingServer.id, updates);
                setServers((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
                toast.success('MCP server updated');
            } else {
                const createPayload: McpServerCreateInput = {
                    name: formState.name.trim(),
                    description: formState.description.trim() || null,
                    transportType: formState.transportType,
                    config: parsedConfig,
                    enabled: formState.enabled,
                };
                const created = await window.api.mcpServer.create(createPayload);
                setServers((prev) => [...prev, created]);
                toast.success('MCP server added');
            }
            handleCloseDialog();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to save MCP server.';
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteClick = (serverId: string) => {
        setDeleteConfirmation({ isOpen: true, serverId });
    };

    const handleConfirmDelete = async () => {
        if (!deleteConfirmation.serverId) return;

        const serverId = deleteConfirmation.serverId;
        setDeleteConfirmation({ isOpen: false, serverId: null });

        try {
            await window.api.mcpServer.delete(serverId);
            setServers((prev) => prev.filter((s) => s.id !== serverId));
            // Clear tools cache
            setServerTools((prev) => {
                const next = { ...prev };
                delete next[serverId];
                return next;
            });
            if (expandedServerId === serverId) {
                setExpandedServerId(null);
            }
            toast.success('MCP server deleted');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to delete MCP server.';
            toast.error(message);
        }
    };

    const handleToggleEnabled = async (server: McpServer) => {
        try {
            let updated: McpServer;
            if (server.enabled) {
                updated = await window.api.mcpServer.disable(server.id);
            } else {
                updated = await window.api.mcpServer.enable(server.id);
            }
            setServers((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
            toast.success(`${server.name} ${updated.enabled ? 'enabled' : 'disabled'}`);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to toggle server.';
            toast.error(message);
        }
    };

    const handleToggleTools = async (serverId: string) => {
        if (expandedServerId === serverId) {
            setExpandedServerId(null);
            return;
        }

        setExpandedServerId(serverId);

        // Fetch tools if not cached
        if (!serverTools[serverId]) {
            setLoadingToolsFor(serverId);
            try {
                const tools = await window.api.mcpServer.getServerTools(serverId);
                setServerTools((prev) => ({ ...prev, [serverId]: tools }));
            } catch (error) {
                console.error('Failed to load tools for server', error);
                setServerTools((prev) => ({ ...prev, [serverId]: [] }));
            } finally {
                setLoadingToolsFor(null);
            }
        }
    };

    const handleRefreshTools = async (serverId: string) => {
        setLoadingToolsFor(serverId);
        try {
            const tools = await window.api.mcpServer.getServerTools(serverId);
            setServerTools((prev) => ({ ...prev, [serverId]: tools }));
        } catch (error) {
            console.error('Failed to refresh tools for server', error);
        } finally {
            setLoadingToolsFor(null);
        }
    };

    const hasServers = servers.length > 0;

    if (isLoading) {
        return <div className="text-sm text-muted-foreground">Loading MCP servers...</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-medium">MCP Servers</h2>
                    <p className="text-xs text-muted-foreground mt-1">
                        Configure Model Context Protocol servers to extend AI capabilities with external tools.
                    </p>
                </div>
                <Button onClick={handleOpenDialog}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Server
                </Button>
            </div>

            {hasServers ? (
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[40px]"></TableHead>
                                <TableHead className="w-[20px] pr-2"></TableHead>
                                <TableHead className="w-[200px] pl-2">Name</TableHead>
                                <TableHead className="w-[120px]">Transport</TableHead>
                                <TableHead className="w-[120px] text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {servers.map((server) => {
                                const isExpanded = expandedServerId === server.id;
                                const tools = serverTools[server.id];
                                const isLoadingTools = loadingToolsFor === server.id;

                                return (
                                    <Fragment key={server.id}>
                                        <TableRow>
                                            <TableCell className="p-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={() => handleToggleTools(server.id)}
                                                    disabled={!server.enabled}
                                                    aria-label={isExpanded ? 'Collapse tools' : 'Expand tools'}
                                                >
                                                    {isExpanded ? (
                                                        <ChevronDown className="h-3.5 w-3.5" />
                                                    ) : (
                                                        <ChevronRight className="h-3.5 w-3.5" />
                                                    )}
                                                </Button>
                                            </TableCell>
                                            <TableCell className="pr-2">
                                                <Switch
                                                    size="sm"
                                                    checked={server.enabled}
                                                    onCheckedChange={() => handleToggleEnabled(server)}
                                                    aria-label={`Toggle ${server.name}`}
                                                />
                                            </TableCell>
                                            <TableCell className="font-medium pl-2">
                                                <div className="min-w-0">
                                                    <span className="block whitespace-normal break-words">
                                                        {server.name}
                                                    </span>
                                                    {server.description && (
                                                        <span className="block text-xs text-muted-foreground whitespace-normal break-words">
                                                            {server.description as string}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">{server.transportType}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    aria-label={`Edit ${server.name}`}
                                                    onClick={() => handleEdit(server)}
                                                >
                                                    <Edit className="size-4" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    aria-label={`Delete ${server.name}`}
                                                    onClick={() => handleDeleteClick(server.id)}
                                                >
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                        {isExpanded && (
                                            <TableRow key={`${server.id}-tools`}>
                                                <TableCell colSpan={5} className="bg-muted/30 p-0">
                                                    <div className="px-6 py-3">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                                                <Wrench className="h-3.5 w-3.5" />
                                                                Available Tools
                                                                {tools && (
                                                                    <Badge
                                                                        variant="outline"
                                                                        className="ml-1 text-[10px] px-1.5 py-0"
                                                                    >
                                                                        {tools.length}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6"
                                                                onClick={() => handleRefreshTools(server.id)}
                                                                disabled={isLoadingTools}
                                                                aria-label="Refresh tools"
                                                            >
                                                                <RefreshCw
                                                                    className={`h-3 w-3 ${isLoadingTools ? 'animate-spin' : ''}`}
                                                                />
                                                            </Button>
                                                        </div>
                                                        {isLoadingTools ? (
                                                            <p className="text-xs text-muted-foreground">
                                                                Loading tools...
                                                            </p>
                                                        ) : tools && tools.length > 0 ? (
                                                            <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                                                {tools.map((tool) => {
                                                                    const serverData = servers.find(
                                                                        (s) => s.id === server.id,
                                                                    );
                                                                    const approvals =
                                                                        (serverData?.toolApprovals as Record<
                                                                            string,
                                                                            boolean
                                                                        >) ?? {};
                                                                    const isApprovalRequired =
                                                                        approvals[tool.name] ?? true;

                                                                    return (
                                                                        <div
                                                                            key={tool.name}
                                                                            className="flex items-center justify-between gap-2 rounded-md border bg-background px-3 py-2 overflow-hidden"
                                                                        >
                                                                            <div className="flex flex-col gap-0.5 min-w-0">
                                                                                <span className="text-xs font-medium font-mono break-all">
                                                                                    {tool.name}
                                                                                </span>
                                                                                {(tool.title || tool.description) && (
                                                                                    <span className="text-[11px] text-muted-foreground leading-tight break-words whitespace-normal">
                                                                                        {tool.description || tool.title}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <div className="flex items-center gap-1.5 shrink-0">
                                                                                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                                                                    Approval
                                                                                </span>
                                                                                <Switch
                                                                                    size="sm"
                                                                                    checked={isApprovalRequired}
                                                                                    onCheckedChange={async (
                                                                                        checked,
                                                                                    ) => {
                                                                                        try {
                                                                                            const updated =
                                                                                                await window.api.mcpServer.updateToolApproval(
                                                                                                    server.id,
                                                                                                    tool.name,
                                                                                                    checked,
                                                                                                );
                                                                                            setServers((prev) =>
                                                                                                prev.map((s) =>
                                                                                                    s.id === updated.id
                                                                                                        ? updated
                                                                                                        : s,
                                                                                                ),
                                                                                            );
                                                                                        } catch (error) {
                                                                                            console.error(
                                                                                                'Failed to update tool approval',
                                                                                                error,
                                                                                            );
                                                                                            toast.error(
                                                                                                'Failed to update tool approval',
                                                                                            );
                                                                                        }
                                                                                    }}
                                                                                    aria-label={`Require approval for ${tool.name}`}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        ) : (
                                                            <p className="text-xs text-muted-foreground">
                                                                No tools available. The server may not be connected.
                                                            </p>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </Fragment>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            ) : (
                <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                    No MCP servers configured yet. Add one to extend AI capabilities with external tools.
                </div>
            )}

            {/* Add/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[550px]">
                    <DialogHeader>
                        <DialogTitle>{editingServer ? 'Edit MCP Server' : 'Add MCP Server'}</DialogTitle>
                        <DialogDescription>
                            {editingServer
                                ? 'Update the server configuration.'
                                : 'Configure a new MCP server connection.'}
                        </DialogDescription>
                    </DialogHeader>
                    <form className="space-y-4" onSubmit={handleSubmit}>
                        <div className="space-y-2">
                            <label className="text-sm font-medium" htmlFor="server-name">
                                Name
                            </label>
                            <Input
                                id="server-name"
                                placeholder="e.g. filesystem-server"
                                value={formState.name}
                                onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium" htmlFor="server-description">
                                Description <span className="text-muted-foreground font-normal">(optional)</span>
                            </label>
                            <Input
                                id="server-description"
                                placeholder="Brief description of the server"
                                value={formState.description}
                                onChange={(e) => setFormState((prev) => ({ ...prev, description: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Transport Type</label>
                            <Select
                                value={formState.transportType}
                                onValueChange={(value) => {
                                    const type = value as TransportType;
                                    setFormState((prev) => ({
                                        ...prev,
                                        transportType: type,
                                        // Update placeholder if config hasn't been modified from a previous placeholder
                                        configJson: Object.values(CONFIG_PLACEHOLDER).includes(prev.configJson)
                                            ? CONFIG_PLACEHOLDER[type]
                                            : prev.configJson,
                                    }));
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select transport type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="stdio">stdio</SelectItem>
                                    <SelectItem value="sse">SSE (Server-Sent Events)</SelectItem>
                                    <SelectItem value="http">HTTP (Streamable HTTP)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium" htmlFor="server-config">
                                Configuration (JSON)
                            </label>
                            <Textarea
                                id="server-config"
                                value={formState.configJson}
                                onChange={(e) => {
                                    setFormState((prev) => ({ ...prev, configJson: e.target.value }));
                                    setJsonError(null);
                                }}
                                placeholder={CONFIG_PLACEHOLDER[formState.transportType]}
                                className="font-mono text-xs min-h-[140px] max-h-60 overflow-y-auto"
                                rows={8}
                            />
                            {jsonError && (
                                <p className="text-sm text-destructive" role="alert">
                                    {jsonError}
                                </p>
                            )}
                            <p className="text-[11px] text-muted-foreground">
                                {formState.transportType === 'stdio'
                                    ? 'Requires "command". Optional: "args", "env", "cwd".'
                                    : 'Requires "url". Optional: "headers".'}
                            </p>
                        </div>
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium" htmlFor="server-enabled">
                                Enabled
                            </label>
                            <Switch
                                id="server-enabled"
                                checked={formState.enabled}
                                onCheckedChange={(checked) => setFormState((prev) => ({ ...prev, enabled: checked }))}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={handleCloseDialog}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting || !formState.name.trim()}>
                                {isSubmitting ? 'Saving...' : editingServer ? 'Save' : 'Add Server'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <ConfirmDialog
                open={deleteConfirmation.isOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        setDeleteConfirmation({ isOpen: false, serverId: null });
                    }
                }}
                onConfirm={handleConfirmDelete}
                title="Delete MCP server?"
                description="This will remove the server configuration and disconnect any active client. This action cannot be undone."
                variant="destructive"
                confirmText="Delete"
            />
        </div>
    );
}
