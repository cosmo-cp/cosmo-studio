import { useBackendMutation, useBackendQuery } from '@/lib/store/backend-hooks';
import type { CommandCreateInput } from 'core/dto';

const commandKeys = {
    list: ['commands', 'list'] as const,
};

type SaveCommandInput = {
    commandId?: string;
    input: CommandCreateInput;
};

export function useGetCommandsQuery() {
    return useBackendQuery(commandKeys.list, (appDataSource) => appDataSource.command.listAll());
}

export function useSaveCommandMutation() {
    return useBackendMutation({
        errorMessage: 'Failed to save command',
        successMessage: (_result, payload: SaveCommandInput) =>
            payload.commandId ? 'Command updated' : 'Command created',
        run: (appDataSource, { commandId, input }: SaveCommandInput) =>
            commandId ? appDataSource.command.update(commandId, input) : appDataSource.command.create(input),
        revalidate: async (_arg, _result, { revalidateKeys }) => {
            await revalidateKeys([commandKeys.list]);
        },
    });
}

export function useDeleteCommandMutation() {
    return useBackendMutation({
        errorMessage: 'Failed to delete command',
        successMessage: 'Command deleted',
        run: (appDataSource, commandId: string) => appDataSource.command.delete(commandId),
        revalidate: async (_arg, _result, { revalidateKeys }) => {
            await revalidateKeys([commandKeys.list]);
        },
    });
}

export function useExecuteCommandMutation() {
    return useBackendMutation({
        errorMessage: 'Failed to execute command',
        run: (appDataSource, input: { input: string }) => appDataSource.command.execute(input),
    });
}
