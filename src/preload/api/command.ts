import { ipcRenderer } from 'electron';
import type { CommandCreateInput, CommandUpdateInput } from '../../../packages/core/dto';
import type { CommandApi } from '../contracts/command';

export const commandApi: CommandApi = {
    listAll: () => {
        return ipcRenderer.invoke('command:listAll');
    },
    create: (input: CommandCreateInput) => {
        return ipcRenderer.invoke('command:create', input);
    },
    update: (id: string, updates: CommandUpdateInput) => {
        return ipcRenderer.invoke('command:update', id, updates);
    },
    delete: (id: string) => {
        return ipcRenderer.invoke('command:delete', id);
    },
    execute: (input: { input: string }) => {
        return ipcRenderer.invoke('command:execute', input);
    },
};
