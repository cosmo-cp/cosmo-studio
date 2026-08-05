import type {
    CommandCreateInput,
    CommandDefinition,
    CommandExecution,
    CommandUpdateInput,
} from '../../../packages/core/dto';
import { callRpc } from '../api/common';
import type { CommandApi } from '../contracts/command';

export const commandHttpApi: CommandApi = {
    listAll: () => {
        return callRpc<CommandDefinition[]>('command', 'listAll', []);
    },
    create: (input: CommandCreateInput) => {
        return callRpc<CommandDefinition>('command', 'create', [input]);
    },
    update: (id: string, updates: CommandUpdateInput) => {
        return callRpc<CommandDefinition>('command', 'update', [id, updates]);
    },
    delete: (id: string) => {
        return callRpc<void>('command', 'delete', [id]);
    },
    execute: (input: { input: string }) => {
        return callRpc<CommandExecution>('command', 'execute', [input]);
    },
};
