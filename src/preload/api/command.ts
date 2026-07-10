import { ipcRenderer } from 'electron';
import type {
  CommandCreateInput,
  CommandDefinition,
  CommandExecution,
  CommandUpdateInput,
} from '../../../packages/core/dto';

export interface CommandApi {
  listAll(): Promise<CommandDefinition[]>;
  create(input: CommandCreateInput): Promise<CommandDefinition>;
  update(id: string, updates: CommandUpdateInput): Promise<CommandDefinition>;
  delete(id: string): Promise<void>;
  execute(input: {input: string}): Promise<CommandExecution>;
}

export const commandApi: CommandApi = {
  listAll: () => ipcRenderer.invoke('command:listAll'),
  create: (input: CommandCreateInput) => ipcRenderer.invoke('command:create', input),
  update: (id: string, updates: CommandUpdateInput) => ipcRenderer.invoke('command:update', id, updates),
  delete: (id: string) => ipcRenderer.invoke('command:delete', id),
  execute: (input: {input: string}) => ipcRenderer.invoke('command:execute', input),
};
