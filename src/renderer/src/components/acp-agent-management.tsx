'use client';

import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Switch} from '@/components/ui/switch';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {Textarea} from '@/components/ui/textarea';
import {useAppDispatch, useAppSelector} from '@/lib/store/hooks';
import {
    deleteAcpAgent,
    installAcpAgentFromRegistry,
    loadAcpAgents,
    loadAcpRegistry,
    saveAcpAgent,
    testAcpAgent,
    toggleAcpAgentEnabled,
} from '@/lib/store/acp-agents-store';
import type {AcpAgentCreateInput, AcpAgentView, AcpRegistryAgent} from 'core/dto';
import {AcpAgentInstallStatusEnum, AcpAgentSourceEnum} from 'core/database/schema/acpAgentSchema';
import {CheckCircle2, Plus, RefreshCw, TestTube2, Trash2, XCircle} from 'lucide-react';
import {useEffect, useMemo, useState} from 'react';
import {toast} from 'sonner';

const emptyForm = {
    name: '',
    description: '',
    command: '',
    argsJson: '[]',
    envJson: '{}',
    defaultCwd: '',
    authMethodId: '',
};

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

    useEffect(() => {
        if (status === 'idle') {
            void dispatch(loadAcpAgents());
        }
    }, [dispatch, status]);

    useEffect(() => {
        if (registryStatus === 'idle') {
            void dispatch(loadAcpRegistry());
        }
    }, [dispatch, registryStatus]);

    const installedRegistryIds = useMemo(
        () => new Set(agents.map((agent) => agent.registryId).filter(Boolean)),
        [agents]
    );
    const visibleRegistryAgents = useMemo(() => {
        const normalized = search.trim().toLowerCase();
        const registryAgents = registry?.agents ?? [];
        if (!normalized) return registryAgents;
        return registryAgents.filter((agent) =>
            `${agent.name} ${agent.description ?? ''} ${agent.id}`.toLowerCase().includes(normalized)
        );
    }, [registry?.agents, search]);

    const handleCreateCustomAgent = async (event: React.FormEvent) => {
        event.preventDefault();
        let args: string[];
        let env: Record<string, string>;
        try {
            args = JSON.parse(form.argsJson);
            env = JSON.parse(form.envJson);
        } catch {
            toast.error('Args and env must be valid JSON.');
            return;
        }
        if (!Array.isArray(args) || args.some((item) => typeof item !== 'string')) {
            toast.error('Args must be a JSON string array.');
            return;
        }
        if (!env || typeof env !== 'object' || Array.isArray(env)) {
            toast.error('Env must be a JSON object.');
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
            await dispatch(saveAcpAgent({input})).unwrap();
            setForm(emptyForm);
            toast.success('ACP agent added');
        } catch (error) {
            toast.error(typeof error === 'string' ? error : 'Failed to add ACP agent');
        }
    };

    const handleToggle = async (agent: AcpAgentView) => {
        try {
            await dispatch(toggleAcpAgentEnabled({agentId: agent.id, enabled: !agent.enabled})).unwrap();
        } catch (error) {
            toast.error(typeof error === 'string' ? error : 'Failed to update ACP agent');
        }
    };

    const handleTest = async (agent: AcpAgentView) => {
        const result = await dispatch(testAcpAgent({agentId: agent.id})).unwrap();
        if (result.ok) {
            toast.success(result.message);
            return;
        }
        toast.error(result.message);
    };

    const handleInstall = async (agent: AcpRegistryAgent) => {
        try {
            await dispatch(installAcpAgentFromRegistry({registryId: agent.id, enabled: true})).unwrap();
            toast.success(`${agent.name} installed`);
        } catch (error) {
            toast.error(typeof error === 'string' ? error : 'Failed to install ACP agent');
        }
    };

    return (
        <div className="flex min-h-0 flex-1 flex-col gap-4">
            <div>
                <h2 className="text-lg font-medium">Agents</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                    Manage local ACP agents for chat and workflow execution.
                </p>
            </div>
            <Tabs defaultValue="installed" className="min-h-0 flex-1">
                <TabsList>
                    <TabsTrigger value="installed">Installed</TabsTrigger>
                    <TabsTrigger value="registry">Registry</TabsTrigger>
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
                                    <TableHead className="w-[160px] text-right">Actions</TableHead>
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
                                                    <Badge variant={agent.installStatus === 'installed' ? 'secondary' : 'outline'}>
                                                        {agent.installStatus}
                                                    </Badge>
                                                    {agent.authMethodId ? <Badge variant="outline">{agent.authMethodId}</Badge> : null}
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
                                            <Button
                                                aria-label={`Test ${agent.name}`}
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => void handleTest(agent)}
                                            >
                                                <TestTube2 className="size-4" />
                                            </Button>
                                            <Button
                                                aria-label={`Delete ${agent.name}`}
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => void dispatch(deleteAcpAgent(agent.id))}
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>
                <TabsContent value="registry" className="min-h-0 space-y-3 overflow-auto">
                    <div className="flex items-center gap-2">
                        <Input
                            className="max-w-sm"
                            placeholder="Search registry"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />
                        <Button
                            variant="outline"
                            onClick={() => void dispatch(loadAcpRegistry({refresh: true}))}
                            disabled={registryStatus === 'loading'}
                        >
                            <RefreshCw className="size-4" />
                            Refresh
                        </Button>
                    </div>
                    {registryError ? (
                        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                            {registryError}
                        </div>
                    ) : null}
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Distribution</TableHead>
                                    <TableHead>Version</TableHead>
                                    <TableHead className="w-[120px] text-right">Install</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {visibleRegistryAgents.map((agent) => {
                                    const installed = installedRegistryIds.has(agent.id);
                                    const installable = isInstallable(agent);
                                    return (
                                        <TableRow key={agent.id}>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{agent.name}</span>
                                                    <span className="line-clamp-2 text-xs text-muted-foreground">
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
                                                    <CheckCircle2 className="ml-auto size-4 text-emerald-600" />
                                                ) : installable ? (
                                                    <Button size="sm" onClick={() => void handleInstall(agent)}>
                                                        <Plus className="size-4" />
                                                        Add
                                                    </Button>
                                                ) : (
                                                    <XCircle className="ml-auto size-4 text-muted-foreground" />
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
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
                                onChange={(event) => setForm({...form, name: event.target.value})}
                            />
                            <Input
                                placeholder="Command"
                                value={form.command}
                                onChange={(event) => setForm({...form, command: event.target.value})}
                            />
                        </div>
                        <Input
                            placeholder="Workspace path"
                            value={form.defaultCwd}
                            onChange={(event) => setForm({...form, defaultCwd: event.target.value})}
                        />
                        <Input
                            placeholder="Auth method ID"
                            value={form.authMethodId}
                            onChange={(event) => setForm({...form, authMethodId: event.target.value})}
                        />
                        <Textarea
                            placeholder="Description"
                            value={form.description}
                            onChange={(event) => setForm({...form, description: event.target.value})}
                        />
                        <Textarea
                            className="font-mono text-xs"
                            placeholder="Args JSON"
                            value={form.argsJson}
                            onChange={(event) => setForm({...form, argsJson: event.target.value})}
                        />
                        <Textarea
                            className="font-mono text-xs"
                            placeholder="Env JSON"
                            value={form.envJson}
                            onChange={(event) => setForm({...form, envJson: event.target.value})}
                        />
                        <Button type="submit">
                            <Plus className="size-4" />
                            Add Agent
                        </Button>
                    </form>
                </TabsContent>
            </Tabs>
        </div>
    );
}
