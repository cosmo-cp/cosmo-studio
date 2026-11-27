import type { CommandCreateInput, CommandDefinition, CommandExecution, CommandUpdateInput } from 'core/dto';
import type { CommandApi } from '../contracts/command';
import { callRpc } from './common';

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
