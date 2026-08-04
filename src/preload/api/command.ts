import { ipcRenderer } from 'electron';
import type {
    CommandCreateInput,
    CommandDefinition,
    CommandExecution,
    CommandUpdateInput,
} from '../../../packages/core/dto';
import { callRpc } from './common';

export interface CommandApi {
    listAll(): Promise<CommandDefinition[]>;

    create(input: CommandCreateInput): Promise<CommandDefinition>;

    update(id: string, updates: CommandUpdateInput): Promise<CommandDefinition>;

    delete(id: string): Promise<void>;

    execute(input: { input: string }): Promise<CommandExecution>;
}

export const commandRpcApi: CommandApi = {
    listAll: () => ipcRenderer.invoke('command:listAll'),
    create: (input: CommandCreateInput) => ipcRenderer.invoke('command:create', input),
    update: (id: string, updates: CommandUpdateInput) => ipcRenderer.invoke('command:update', id, updates),
    delete: (id: string) => ipcRenderer.invoke('command:delete', id),
    execute: (input: { input: string }) => ipcRenderer.invoke('command:execute', input),
};

export const commandHttpApi: CommandApi = {
    listAll: () => callRpc<CommandDefinition[]>('command', 'listAll', []),
    create: (input: CommandCreateInput) => callRpc<CommandDefinition>('command', 'create', [input]),
    update: (id: string, updates: CommandUpdateInput) => callRpc<CommandDefinition>('command', 'update', [id, updates]),
    delete: (id: string) => callRpc<void>('command', 'delete', [id]),
    execute: (input: { input: string }) => callRpc<CommandExecution>('command', 'execute', [input]),
};
