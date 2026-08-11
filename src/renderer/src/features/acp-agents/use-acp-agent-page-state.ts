'use client';

import {
    useDeleteAcpAgentMutation,
    useGetAcpAgentsQuery,
    useGetAcpRegistryQuery,
    useInstallAcpAgentFromRegistryMutation,
    useRefreshAcpRegistryMutation,
    useSaveAcpAgentMutation,
    useTestAcpAgentMutation,
    useToggleAcpAgentEnabledMutation,
} from '@/features/acp-agents/acp-agents-api';
import { AcpAgentInstallStatusEnum, AcpAgentSourceEnum } from 'core/database/schema/acpAgentSchema';
import type { AcpAgentCreateInput, AcpAgentUpdateInput, AcpAgentView, AcpRegistryAgent } from 'core/dto';
import { useMemo, useState, type FormEvent } from 'react';
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

export function getDistributionLabel(agent: AcpRegistryAgent): string {
    const distribution = agent.distribution ?? {};
    if (distribution.npx) {
        return 'npx';
    }
    if (distribution.uvx) {
        return 'uvx';
    }
    if (distribution.binary) {
        return 'binary';
    }

    return 'unknown';
}

export function isInstallable(agent: AcpRegistryAgent): boolean {
    const distribution = agent.distribution ?? {};
    return Boolean(distribution.npx || distribution.uvx);
}

export function useAcpAgentPageState() {
    const { data: agents = [], error: agentsError } = useGetAcpAgentsQuery();
    const [search, setSearch] = useState('');
    const [form, setForm] = useState(emptyForm);
    const [editForm, setEditForm] = useState(emptyEditForm);
    const [editingAgent, setEditingAgent] = useState<AcpAgentView | null>(null);
    const [registryDialogOpen, setRegistryDialogOpen] = useState(false);
    const [installingRegistryId, setInstallingRegistryId] = useState<string | null>(null);
    const {
        data: registry,
        isLoading: isRegistryLoading,
        error: registryError,
    } = useGetAcpRegistryQuery(undefined, {
        skip: !registryDialogOpen,
    });
    const [saveAcpAgent] = useSaveAcpAgentMutation();
    const [deleteAcpAgent] = useDeleteAcpAgentMutation();
    const [toggleAcpAgentEnabled] = useToggleAcpAgentEnabledMutation();
    const [testAcpAgent] = useTestAcpAgentMutation();
    const [installAcpAgentFromRegistry] = useInstallAcpAgentFromRegistryMutation();
    const [refreshAcpRegistry] = useRefreshAcpRegistryMutation();

    const installedRegistryIds = useMemo(
        () => new Set(agents.map((agent) => agent.registryId).filter(Boolean)),
        [agents],
    );
    const visibleRegistryAgents = useMemo(() => {
        const normalized = search.trim().toLowerCase();
        const registryAgents = registry?.agents ?? [];
        if (!normalized) {
            return registryAgents;
        }

        return registryAgents.filter((agent) =>
            `${agent.name} ${agent.description ?? ''} ${agent.id}`.toLowerCase().includes(normalized),
        );
    }, [registry?.agents, search]);

    const createCustomAgent = async (event: FormEvent<HTMLFormElement>) => {
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

        const result = await saveAcpAgent({ input });
        if ('data' in result) {
            setForm(emptyForm);
        }
    };

    const editAgent = (agent: AcpAgentView) => {
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

    const updateAgent = async (event: FormEvent<HTMLFormElement>) => {
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

        const result = await saveAcpAgent({ agentId: editingAgent.id, input });
        if ('data' in result) {
            setEditingAgent(null);
            setEditForm(emptyEditForm);
        }
    };

    const toggleAgent = async (agent: AcpAgentView) => {
        await toggleAcpAgentEnabled({ agentId: agent.id, enabled: !agent.enabled });
    };

    const testAgent = async (agent: AcpAgentView) => {
        const result = await testAcpAgent({ agentId: agent.id });
        if ('error' in result || !result.data) {
            return;
        }

        if (result.data.ok) {
            toast.success(result.data.message);
            return;
        }

        toast.error(result.data.message);
    };

    const installRegistryAgent = async (agent: AcpRegistryAgent) => {
        setInstallingRegistryId(agent.id);
        await installAcpAgentFromRegistry({ registryId: agent.id, enabled: true });
        setInstallingRegistryId(null);
    };

    const deleteAgent = async (agentId: string) => {
        await deleteAcpAgent(agentId);
    };

    const refreshRegistry = async () => {
        await refreshAcpRegistry();
    };

    return {
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
        registry,
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
    };
}
