import type { BackendCacheHelpers } from '@/lib/store/backend-hooks';
import { useBackendMutation, useBackendQuery } from '@/lib/store/backend-hooks';
import type { McpServer, McpServerCreateInput, McpToolDefinition } from 'core/dto';

interface McpToolCatalog {
    servers: McpServer[];
    toolsByServerId: Record<string, McpToolDefinition[]>;
}

const mcpServerKeys = {
    list: ['mcp-servers', 'list'] as const,
    tools: (serverId: string) => ['mcp-servers', 'tools', serverId] as const,
    catalog: ['mcp-servers', 'catalog'] as const,
};

type SaveMcpServerInput = {
    serverId?: string;
    input: McpServerCreateInput;
};

async function revalidateMcpServerData(revalidateKeys: BackendCacheHelpers['revalidateKeys'], serverId?: string) {
    await revalidateKeys([
        mcpServerKeys.list,
        mcpServerKeys.catalog,
        ...(serverId ? [mcpServerKeys.tools(serverId)] : []),
    ]);
}

export function useGetMcpServersQuery() {
    return useBackendQuery(mcpServerKeys.list, (appDataSource) => appDataSource.mcpServer.getAll());
}

export function useGetMcpToolCatalogQuery(
    _arg?: void,
    options?: {
        skip?: boolean;
    },
) {
    return useBackendQuery(
        mcpServerKeys.catalog,
        async (appDataSource) => {
            const servers = await appDataSource.mcpServer.getAll();
            const enabledServers = servers.filter((server) => server.enabled);
            const toolEntries = await Promise.all(
                enabledServers.map(
                    async (server) => [server.id, await appDataSource.mcpServer.getServerTools(server.id)] as const,
                ),
            );

            return {
                servers: enabledServers,
                toolsByServerId: Object.fromEntries(toolEntries),
            } satisfies McpToolCatalog;
        },
        { skip: options?.skip },
    );
}

export function useLazyGetMcpServerToolsQuery() {
    return useBackendMutation({
        errorMessage: 'Failed to load tools',
        run: (appDataSource, serverId: string) => appDataSource.mcpServer.getServerTools(serverId),
        revalidate: async (serverId, _result, { revalidateKeys }) => {
            await revalidateKeys([mcpServerKeys.tools(serverId)]);
        },
    });
}

export function useSaveMcpServerMutation() {
    return useBackendMutation({
        errorMessage: 'Failed to save MCP server',
        successMessage: (_result, payload: SaveMcpServerInput) =>
            payload.serverId ? 'MCP server updated' : 'MCP server added',
        run: (appDataSource, { serverId, input }: SaveMcpServerInput) =>
            serverId ? appDataSource.mcpServer.update(serverId, input) : appDataSource.mcpServer.create(input),
        revalidate: async ({ serverId }, _result, { revalidateKeys }) => {
            await revalidateMcpServerData(revalidateKeys, serverId);
        },
    });
}

export function useDeleteMcpServerMutation() {
    return useBackendMutation({
        errorMessage: 'Failed to delete MCP server',
        successMessage: 'MCP server deleted',
        run: (appDataSource, serverId: string) => appDataSource.mcpServer.delete(serverId),
        revalidate: async (serverId, _result, { revalidateKeys }) => {
            await revalidateMcpServerData(revalidateKeys, serverId);
        },
    });
}

export function useToggleMcpServerEnabledMutation() {
    return useBackendMutation({
        errorMessage: 'Failed to toggle server',
        successMessage: (result: McpServer) => `${result.name} ${result.enabled ? 'enabled' : 'disabled'}`,
        run: (appDataSource, { serverId, enabled }: { serverId: string; enabled: boolean }) =>
            enabled ? appDataSource.mcpServer.enable(serverId) : appDataSource.mcpServer.disable(serverId),
        revalidate: async ({ serverId }, _result, { revalidateKeys }) => {
            await revalidateMcpServerData(revalidateKeys, serverId);
        },
    });
}

export function useUpdateMcpToolApprovalMutation() {
    return useBackendMutation({
        errorMessage: 'Failed to update tool approval',
        run: (
            appDataSource,
            { serverId, toolName, needsApproval }: { serverId: string; toolName: string; needsApproval: boolean },
        ) => appDataSource.mcpServer.updateToolApproval(serverId, toolName, needsApproval),
        revalidate: async ({ serverId }, _result, { revalidateKeys }) => {
            await revalidateMcpServerData(revalidateKeys, serverId);
        },
    });
}
