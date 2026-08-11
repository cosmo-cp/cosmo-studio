import type { BackendCacheHelpers } from '@/lib/store/backend-hooks';
import { useBackendMutation, useBackendQuery } from '@/lib/store/backend-hooks';
import type { AcpAgentCreateInput, AcpAgentUpdateInput, AcpAgentView, AcpRegistryInstallInput } from 'core/dto';

const acpAgentKeys = {
    list: ['acp-agents', 'list'] as const,
    registry: ['acp-agents', 'registry'] as const,
};

type SaveAcpAgentInput = {
    agentId?: string;
    input: AcpAgentCreateInput | AcpAgentUpdateInput;
};

async function revalidateAcpAgentData(revalidateKeys: BackendCacheHelpers['revalidateKeys'], includeRegistry = false) {
    await revalidateKeys([acpAgentKeys.list, ...(includeRegistry ? [acpAgentKeys.registry] : [])]);
}

export function useGetAcpAgentsQuery() {
    return useBackendQuery(acpAgentKeys.list, (appDataSource) => appDataSource.acpAgent.getAll());
}

export function useGetAcpRegistryQuery(
    _arg?: void,
    options?: {
        skip?: boolean;
    },
) {
    return useBackendQuery(acpAgentKeys.registry, (appDataSource) => appDataSource.acpAgent.getRegistry(), {
        skip: options?.skip,
    });
}

export function useRefreshAcpRegistryMutation() {
    return useBackendMutation({
        errorMessage: 'Failed to refresh ACP registry',
        run: (appDataSource, _arg: void) => {
            void _arg;
            return appDataSource.acpAgent.refreshRegistry();
        },
        revalidate: async (_arg, _result, { revalidateKeys }) => {
            await revalidateAcpAgentData(revalidateKeys, true);
        },
    });
}

export function useSaveAcpAgentMutation() {
    return useBackendMutation({
        errorMessage: 'Failed to save ACP agent',
        successMessage: (_result, payload: SaveAcpAgentInput) =>
            payload.agentId ? 'ACP agent updated' : 'ACP agent added',
        run: (appDataSource, { agentId, input }: SaveAcpAgentInput) =>
            agentId
                ? appDataSource.acpAgent.update(agentId, input)
                : appDataSource.acpAgent.create(input as AcpAgentCreateInput),
        revalidate: async (_arg, _result, { revalidateKeys }) => {
            await revalidateAcpAgentData(revalidateKeys);
        },
    });
}

export function useDeleteAcpAgentMutation() {
    return useBackendMutation({
        errorMessage: 'Failed to delete ACP agent',
        run: (appDataSource, agentId: string) => appDataSource.acpAgent.delete(agentId),
        revalidate: async (_arg, _result, { revalidateKeys }) => {
            await revalidateAcpAgentData(revalidateKeys);
        },
    });
}

export function useToggleAcpAgentEnabledMutation() {
    return useBackendMutation({
        errorMessage: 'Failed to toggle ACP agent',
        run: (appDataSource, { agentId, enabled }: { agentId: string; enabled: boolean }) =>
            enabled ? appDataSource.acpAgent.enable(agentId) : appDataSource.acpAgent.disable(agentId),
        revalidate: async (_arg, _result, { revalidateKeys }) => {
            await revalidateAcpAgentData(revalidateKeys);
        },
    });
}

export function useInstallAcpAgentFromRegistryMutation() {
    return useBackendMutation({
        errorMessage: 'Failed to install ACP agent',
        successMessage: (result: AcpAgentView) => `${result.name} installed`,
        run: (appDataSource, input: AcpRegistryInstallInput) => appDataSource.acpAgent.installFromRegistry(input),
        revalidate: async (_arg, _result, { revalidateKeys }) => {
            await revalidateAcpAgentData(revalidateKeys, true);
        },
    });
}

export function useTestAcpAgentMutation() {
    return useBackendMutation({
        errorMessage: 'Failed to test ACP agent',
        run: (appDataSource, { agentId, cwd }: { agentId: string; cwd?: string | null }) =>
            appDataSource.acpAgent.test(agentId, cwd ?? null),
    });
}
