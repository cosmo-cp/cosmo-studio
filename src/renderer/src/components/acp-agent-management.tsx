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
    getDistributionLabel,
    isInstallable,
    useAcpAgentPageState,
} from '@/features/acp-agents/use-acp-agent-page-state';
import { CheckCircle2, Download, Pencil, Plus, RefreshCw, TestTube2, Trash2, XCircle } from 'lucide-react';

export function AcpAgentManagement() {
    const {
        agents,
        agentsError,
        search,
        setSearch,
        form,
        setForm,
        editForm,
        setEditForm,
        editingAgent,
        registryDialogOpen,
        installingRegistryId,
        isRegistryLoading,
        registryError,
        installedRegistryIds,
        visibleRegistryAgents,
        setRegistryDialogOpen,
        createCustomAgent,
        editAgent,
        handleEditDialogOpenChange,
        updateAgent,
        toggleAgent,
        testAgent,
        installRegistryAgent,
        deleteAgent,
        refreshRegistry,
    } = useAcpAgentPageState();

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
                    <Button onClick={() => setRegistryDialogOpen(true)} className="self-start sm:self-auto">
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
                        {agentsError ? (
                            <div className="mb-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                                {agentsError}
                            </div>
                        ) : null}
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12">On</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Command</TableHead>
                                        <TableHead>Workspace</TableHead>
                                        <TableHead className="w-48 text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {agents.map((agent) => (
                                        <TableRow key={agent.id}>
                                            <TableCell>
                                                <Switch
                                                    size="sm"
                                                    checked={agent.enabled}
                                                    onCheckedChange={() => void toggleAgent(agent)}
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
                                            <TableCell className="max-w-65 truncate font-mono text-xs">
                                                {[agent.command, ...agent.args].join(' ')}
                                            </TableCell>
                                            <TableCell className="max-w-55 truncate text-xs text-muted-foreground">
                                                {agent.defaultCwd || 'Not set'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            aria-label={`Test ${agent.name}`}
                                                            size="icon"
                                                            variant="ghost"
                                                            onClick={() => void testAgent(agent)}
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
                                                            onClick={() => editAgent(agent)}
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
                                                            onClick={() => void deleteAgent(agent.id)}
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
                        <form className="max-w-2xl space-y-4" onSubmit={(event) => void createCustomAgent(event)}>
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
                    <DialogContent className="flex max-h-[85dvh] flex-col overflow-hidden sm:max-w-160">
                        <DialogHeader>
                            <DialogTitle>Edit agent</DialogTitle>
                            <DialogDescription>
                                Update the local command, workspace, auth, and environment replacement for this ACP
                                agent.
                            </DialogDescription>
                        </DialogHeader>
                        <form
                            className="flex min-h-0 flex-1 flex-col gap-4"
                            onSubmit={(event) => void updateAgent(event)}
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
                <Dialog open={registryDialogOpen} onOpenChange={setRegistryDialogOpen}>
                    <DialogContent className="flex max-h-[85dvh] w-[calc(100vw-2rem)] max-w-225 min-w-0 flex-col overflow-hidden p-0">
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
                                    onClick={() => void refreshRegistry()}
                                    disabled={isRegistryLoading}
                                    className="sm:ml-auto"
                                >
                                    <RefreshCw className={isRegistryLoading ? 'size-4 animate-spin' : 'size-4'} />
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
                                            <TableHead className="w-30">Distribution</TableHead>
                                            <TableHead className="w-25">Version</TableHead>
                                            <TableHead className="w-32 text-right">Install</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isRegistryLoading && visibleRegistryAgents.length === 0 ? (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={4}
                                                    className="h-24 text-center text-sm text-muted-foreground"
                                                >
                                                    Loading registry...
                                                </TableCell>
                                            </TableRow>
                                        ) : null}
                                        {!isRegistryLoading && visibleRegistryAgents.length === 0 ? (
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
                                                            <span className="line-clamp-2 wrap-break-word text-xs text-muted-foreground">
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
                                                                onClick={() => void installRegistryAgent(agent)}
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
