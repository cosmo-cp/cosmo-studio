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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
    deleteAcpAgent,
    installAcpAgentFromRegistry,
    loadAcpAgents,
    loadAcpRegistry,
    saveAcpAgent,
    testAcpAgent,
    toggleAcpAgentEnabled,
} from '@/lib/store/acp-agents-store';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { AcpAgentInstallStatusEnum, AcpAgentSourceEnum } from 'core/database/schema/acpAgentSchema';
import type { AcpAgentCreateInput, AcpAgentUpdateInput, AcpAgentView, AcpRegistryAgent } from 'core/dto';
import { CheckCircle2, Download, Pencil, Plus, RefreshCw, TestTube2, Trash2, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

const emptyForm = {
    name: '',
    description: '',
    command: '',
    argsJson: '[]',
    envJson: '{}',
    defaultCwd: '',
    authMethodId: '',
};

const emptyEditForm = {
    name: '',
    description: '',
    command: '',
    argsJson: '[]',
    envJson: '',
    defaultCwd: '',
    authMethodId: '',
};

function parseStringArrayJson(value: string, field: string): string[] {
    let parsed: unknown;
    try {
        parsed = JSON.parse(value);
    } catch {
        throw new Error(`${field} must be valid JSON.`);
    }
    if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== 'string')) {
        throw new Error(`${field} must be a JSON string array.`);
    }
    return parsed;
}

function parseStringRecordJson(value: string, field: string): Record<string, string> {
    let parsed: unknown;
    try {
        parsed = JSON.parse(value);
    } catch {
        throw new Error(`${field} must be valid JSON.`);
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error(`${field} must be a JSON object.`);
    }
    return Object.fromEntries(Object.entries(parsed).map(([key, recordValue]) => [key, String(recordValue ?? '')]));
}

function getDistributionLabel(agent: AcpRegistryAgent): string {
    const distribution = agent.distribution ?? {};
    if (distribution.npx) return 'npx';
    if (distribution.uvx) return 'uvx';
    if (distribution.binary) return 'binary';
    return 'unknown';
}

function isInstallable(agent: AcpRegistryAgent): boolean {
    const distribution = agent.distribution ?? {};
    return Boolean(distribution.npx || distribution.uvx);
}

export function AcpAgentManagement() {
    const dispatch = useAppDispatch();
    const agents = useAppSelector((state) => state.acpAgents.items);
    const status = useAppSelector((state) => state.acpAgents.status);
    const errorMessage = useAppSelector((state) => state.acpAgents.errorMessage);
    const registry = useAppSelector((state) => state.acpAgents.registry);
    const registryStatus = useAppSelector((state) => state.acpAgents.registryStatus);
    const registryError = useAppSelector((state) => state.acpAgents.registryErrorMessage);
    const [search, setSearch] = useState('');
    const [form, setForm] = useState(emptyForm);
    const [editForm, setEditForm] = useState(emptyEditForm);
    const [editingAgent, setEditingAgent] = useState<AcpAgentView | null>(null);
    const [registryDialogOpen, setRegistryDialogOpen] = useState(false);
    const [installingRegistryId, setInstallingRegistryId] = useState<string | null>(null);

    useEffect(() => {
        if (status === 'idle') {
            void dispatch(loadAcpAgents());
        }
    }, [dispatch, status]);

    const installedRegistryIds = useMemo(
        () => new Set(agents.map((agent) => agent.registryId).filter(Boolean)),
        [agents],
    );
    const visibleRegistryAgents = useMemo(() => {
        const normalized = search.trim().toLowerCase();
        const registryAgents = registry?.agents ?? [];
        if (!normalized) return registryAgents;
        return registryAgents.filter((agent) =>
            `${agent.name} ${agent.description ?? ''} ${agent.id}`.toLowerCase().includes(normalized),
        );
    }, [registry?.agents, search]);

    const handleCreateCustomAgent = async (event: React.FormEvent) => {
        event.preventDefault();
        let args: string[];
        let env: Record<string, string>;
        try {
            args = parseStringArrayJson(form.argsJson, 'Args');
            env = parseStringRecordJson(form.envJson, 'Env');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Invalid ACP agent form.');
            return;
        }

        const input: AcpAgentCreateInput = {
            name: form.name.trim(),
            description: form.description.trim() || null,
            source: AcpAgentSourceEnum.CUSTOM,
            registryId: null,
            version: null,
            command: form.command.trim(),
            args,
            env,
            defaultCwd: form.defaultCwd.trim() || null,
            authMethodId: form.authMethodId.trim() || null,
            enabled: true,
            installStatus: AcpAgentInstallStatusEnum.INSTALLED,
            mcpServerIds: [],
            metadata: {},
        };
        try {
            await dispatch(saveAcpAgent({ input })).unwrap();
            setForm(emptyForm);
            toast.success('ACP agent added');
        } catch (error) {
            toast.error(typeof error === 'string' ? error : 'Failed to add ACP agent');
        }
    };

    const handleEdit = (agent: AcpAgentView) => {
        setEditingAgent(agent);
        setEditForm({
            name: agent.name,
            description: agent.description ?? '',
            command: agent.command,
            argsJson: JSON.stringify(agent.args, null, 2),
            envJson: '',
            defaultCwd: agent.defaultCwd ?? '',
            authMethodId: agent.authMethodId ?? '',
        });
    };

    const handleEditDialogOpenChange = (open: boolean) => {
        if (!open) {
            setEditingAgent(null);
            setEditForm(emptyEditForm);
        }
    };

    const handleUpdateAgent = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!editingAgent) {
            return;
        }

        let args: string[];
        let env: Record<string, string> | undefined;
        try {
            args = parseStringArrayJson(editForm.argsJson, 'Args');
            env =
                editForm.envJson.trim().length > 0
                    ? parseStringRecordJson(editForm.envJson, 'Replacement env')
                    : undefined;
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Invalid ACP agent form.');
            return;
        }

        const input: AcpAgentUpdateInput = {
            name: editForm.name.trim(),
            description: editForm.description.trim() || null,
            command: editForm.command.trim(),
            args,
            defaultCwd: editForm.defaultCwd.trim() || null,
            authMethodId: editForm.authMethodId.trim() || null,
        };
        if (env !== undefined) {
            input.env = env;
        }

        try {
            await dispatch(saveAcpAgent({ agentId: editingAgent.id, input })).unwrap();
            setEditingAgent(null);
            setEditForm(emptyEditForm);
            toast.success('ACP agent updated');
        } catch (error) {
            toast.error(typeof error === 'string' ? error : 'Failed to update ACP agent');
        }
    };

    const handleToggle = async (agent: AcpAgentView) => {
        try {
            await dispatch(toggleAcpAgentEnabled({ agentId: agent.id, enabled: !agent.enabled })).unwrap();
        } catch (error) {
            toast.error(typeof error === 'string' ? error : 'Failed to update ACP agent');
        }
    };

    const handleTest = async (agent: AcpAgentView) => {
        const result = await dispatch(testAcpAgent({ agentId: agent.id })).unwrap();
        if (result.ok) {
            toast.success(result.message);
            return;
        }
        toast.error(result.message);
    };

    const handleRegistryOpenChange = (open: boolean) => {
        setRegistryDialogOpen(open);
        if (open && registryStatus === 'idle') {
            void dispatch(loadAcpRegistry());
        }
    };

    const handleInstall = async (agent: AcpRegistryAgent) => {
        setInstallingRegistryId(agent.id);
        try {
            await dispatch(installAcpAgentFromRegistry({ registryId: agent.id, enabled: true })).unwrap();
            toast.success(`${agent.name} installed`);
        } catch (error) {
            toast.error(typeof error === 'string' ? error : 'Failed to install ACP agent');
        } finally {
            setInstallingRegistryId(null);
        }
    };

    return (
        <TooltipProvider>
            <div className="flex min-h-0 flex-1 flex-col gap-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h2 className="text-lg font-medium">Agents</h2>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Manage local ACP agents for chat and workflow execution.
                        </p>
                    </div>
                    <Button onClick={() => handleRegistryOpenChange(true)} className="self-start sm:self-auto">
                        <Download className="size-4" />
                        Registry
                    </Button>
                </div>
                <Tabs defaultValue="installed" className="min-h-0 flex-1">
                    <TabsList>
                        <TabsTrigger value="installed">Installed</TabsTrigger>
                        <TabsTrigger value="custom">Custom</TabsTrigger>
                    </TabsList>
                    <TabsContent value="installed" className="min-h-0 overflow-auto">
                        {errorMessage ? (
                            <div className="mb-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                                {errorMessage}
                            </div>
                        ) : null}
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[48px]">On</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Command</TableHead>
                                        <TableHead>Workspace</TableHead>
                                        <TableHead className="w-[192px] text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {agents.map((agent) => (
                                        <TableRow key={agent.id}>
                                            <TableCell>
                                                <Switch
                                                    size="sm"
                                                    checked={agent.enabled}
                                                    onCheckedChange={() => void handleToggle(agent)}
                                                    aria-label={`Toggle ${agent.name}`}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-medium">{agent.name}</span>
                                                    <div className="flex flex-wrap gap-1">
                                                        <Badge variant="outline">{agent.source}</Badge>
                                                        <Badge
                                                            variant={
                                                                agent.installStatus === 'installed'
                                                                    ? 'secondary'
                                                                    : 'outline'
                                                            }
                                                        >
                                                            {agent.installStatus}
                                                        </Badge>
                                                        {agent.authMethodId ? (
                                                            <Badge variant="outline">{agent.authMethodId}</Badge>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="max-w-[260px] truncate font-mono text-xs">
                                                {[agent.command, ...agent.args].join(' ')}
                                            </TableCell>
                                            <TableCell className="max-w-[220px] truncate text-xs text-muted-foreground">
                                                {agent.defaultCwd || 'Not set'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            aria-label={`Test ${agent.name}`}
                                                            size="icon"
                                                            variant="ghost"
                                                            onClick={() => void handleTest(agent)}
                                                        >
                                                            <TestTube2 className="size-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top">Test connection</TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            aria-label={`Edit ${agent.name}`}
                                                            size="icon"
                                                            variant="ghost"
                                                            onClick={() => handleEdit(agent)}
                                                        >
                                                            <Pencil className="size-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top">Edit agent</TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            aria-label={`Delete ${agent.name}`}
                                                            size="icon"
                                                            variant="ghost"
                                                            onClick={() => void dispatch(deleteAcpAgent(agent.id))}
                                                        >
                                                            <Trash2 className="size-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top">Delete agent</TooltipContent>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>
                    <TabsContent value="custom" className="overflow-auto">
                        <form className="max-w-2xl space-y-4" onSubmit={(event) => void handleCreateCustomAgent(event)}>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <Input
                                    placeholder="Name"
                                    value={form.name}
                                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                                />
                                <Input
                                    placeholder="Command"
                                    value={form.command}
                                    onChange={(event) => setForm({ ...form, command: event.target.value })}
                                />
                            </div>
                            <Input
                                placeholder="Workspace path"
                                value={form.defaultCwd}
                                onChange={(event) => setForm({ ...form, defaultCwd: event.target.value })}
                            />
                            <Input
                                placeholder="Auth method ID"
                                value={form.authMethodId}
                                onChange={(event) => setForm({ ...form, authMethodId: event.target.value })}
                            />
                            <Textarea
                                placeholder="Description"
                                value={form.description}
                                onChange={(event) => setForm({ ...form, description: event.target.value })}
                            />
                            <Textarea
                                className="font-mono text-xs"
                                placeholder="Args JSON"
                                value={form.argsJson}
                                onChange={(event) => setForm({ ...form, argsJson: event.target.value })}
                            />
                            <Textarea
                                className="font-mono text-xs"
                                placeholder="Env JSON"
                                value={form.envJson}
                                onChange={(event) => setForm({ ...form, envJson: event.target.value })}
                            />
                            <Button type="submit">
                                <Plus className="size-4" />
                                Add Agent
                            </Button>
                        </form>
                    </TabsContent>
                </Tabs>
                <Dialog open={editingAgent !== null} onOpenChange={handleEditDialogOpenChange}>
                    <DialogContent className="flex max-h-[85dvh] flex-col overflow-hidden sm:max-w-[640px]">
                        <DialogHeader>
                            <DialogTitle>Edit agent</DialogTitle>
                            <DialogDescription>
                                Update the local command, workspace, auth, and environment replacement for this ACP
                                agent.
                            </DialogDescription>
                        </DialogHeader>
                        <form
                            className="flex min-h-0 flex-1 flex-col gap-4"
                            onSubmit={(event) => void handleUpdateAgent(event)}
                        >
                            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium" htmlFor="edit-agent-name">
                                            Name
                                        </label>
                                        <Input
                                            id="edit-agent-name"
                                            value={editForm.name}
                                            onChange={(event) => setEditForm({ ...editForm, name: event.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium" htmlFor="edit-agent-command">
                                            Command
                                        </label>
                                        <Input
                                            id="edit-agent-command"
                                            value={editForm.command}
                                            onChange={(event) =>
                                                setEditForm({ ...editForm, command: event.target.value })
                                            }
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium" htmlFor="edit-agent-workspace">
                                            Workspace path
                                        </label>
                                        <Input
                                            id="edit-agent-workspace"
                                            value={editForm.defaultCwd}
                                            onChange={(event) =>
                                                setEditForm({ ...editForm, defaultCwd: event.target.value })
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium" htmlFor="edit-agent-auth">
                                            Auth method ID
                                        </label>
                                        <Input
                                            id="edit-agent-auth"
                                            value={editForm.authMethodId}
                                            onChange={(event) =>
                                                setEditForm({ ...editForm, authMethodId: event.target.value })
                                            }
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium" htmlFor="edit-agent-description">
                                        Description
                                    </label>
                                    <Textarea
                                        id="edit-agent-description"
                                        value={editForm.description}
                                        onChange={(event) =>
                                            setEditForm({ ...editForm, description: event.target.value })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium" htmlFor="edit-agent-args">
                                        Args JSON
                                    </label>
                                    <Textarea
                                        className="font-mono text-xs"
                                        id="edit-agent-args"
                                        value={editForm.argsJson}
                                        onChange={(event) => setEditForm({ ...editForm, argsJson: event.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium" htmlFor="edit-agent-env">
                                        Replacement env JSON
                                    </label>
                                    <Textarea
                                        className="font-mono text-xs"
                                        id="edit-agent-env"
                                        placeholder='{"TOKEN":"new-value"}'
                                        value={editForm.envJson}
                                        onChange={(event) => setEditForm({ ...editForm, envJson: event.target.value })}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        {editingAgent?.envKeys.length
                                            ? `Stored env keys: ${editingAgent.envKeys.join(', ')}. Leave blank to keep them.`
                                            : 'Leave blank to keep the current env unchanged.'}
                                    </p>
                                </div>
                            </div>
                            <DialogFooter className="shrink-0">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => handleEditDialogOpenChange(false)}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit">Save changes</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
                <Dialog open={registryDialogOpen} onOpenChange={handleRegistryOpenChange}>
                    <DialogContent className="flex max-h-[85dvh] w-[calc(100vw-2rem)] max-w-[900px] min-w-0 flex-col overflow-hidden p-0">
                        <DialogHeader className="shrink-0 px-6 pt-6 pr-12">
                            <DialogTitle>ACP Registry</DialogTitle>
                            <DialogDescription>
                                Browse installable ACP agents from the public registry.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-6 pb-6">
                            <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
                                <Input
                                    className="min-w-0 sm:max-w-sm"
                                    placeholder="Search agents"
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                />
                                <Button
                                    variant="outline"
                                    onClick={() => void dispatch(loadAcpRegistry({ refresh: true }))}
                                    disabled={registryStatus === 'loading'}
                                    className="sm:ml-auto"
                                >
                                    <RefreshCw
                                        className={registryStatus === 'loading' ? 'size-4 animate-spin' : 'size-4'}
                                    />
                                    Refresh
                                </Button>
                            </div>
                            {registryError ? (
                                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                                    {registryError}
                                </div>
                            ) : null}
                            <div
                                className="min-h-0 flex-1 overflow-auto rounded-md border"
                                data-testid="acp-registry-table-scroll"
                            >
                                <Table className="table-fixed">
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[52%]">Name</TableHead>
                                            <TableHead className="w-[120px]">Distribution</TableHead>
                                            <TableHead className="w-[100px]">Version</TableHead>
                                            <TableHead className="w-[128px] text-right">Install</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {registryStatus === 'loading' && visibleRegistryAgents.length === 0 ? (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={4}
                                                    className="h-24 text-center text-sm text-muted-foreground"
                                                >
                                                    Loading registry...
                                                </TableCell>
                                            </TableRow>
                                        ) : null}
                                        {registryStatus !== 'loading' && visibleRegistryAgents.length === 0 ? (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={4}
                                                    className="h-24 text-center text-sm text-muted-foreground"
                                                >
                                                    No registry agents found.
                                                </TableCell>
                                            </TableRow>
                                        ) : null}
                                        {visibleRegistryAgents.map((agent) => {
                                            const installed = installedRegistryIds.has(agent.id);
                                            const installable = isInstallable(agent);
                                            const installing = installingRegistryId === agent.id;
                                            return (
                                                <TableRow key={agent.id}>
                                                    <TableCell className="min-w-0 whitespace-normal">
                                                        <div className="flex min-w-0 flex-col">
                                                            <span className="truncate font-medium">{agent.name}</span>
                                                            <span className="line-clamp-2 break-words text-xs text-muted-foreground">
                                                                {agent.description}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={installable ? 'secondary' : 'outline'}>
                                                            {getDistributionLabel(agent)}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>{agent.version}</TableCell>
                                                    <TableCell className="text-right">
                                                        {installed ? (
                                                            <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
                                                                <CheckCircle2 className="size-4 text-emerald-600" />
                                                                Installed
                                                            </div>
                                                        ) : installable ? (
                                                            <Button
                                                                size="sm"
                                                                onClick={() => void handleInstall(agent)}
                                                                disabled={installingRegistryId !== null}
                                                            >
                                                                {installing ? (
                                                                    <RefreshCw className="size-4 animate-spin" />
                                                                ) : (
                                                                    <Plus className="size-4" />
                                                                )}
                                                                {installing ? 'Installing' : 'Install'}
                                                            </Button>
                                                        ) : (
                                                            <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
                                                                <XCircle className="size-4" />
                                                                Manual
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </TooltipProvider>
    );
}
