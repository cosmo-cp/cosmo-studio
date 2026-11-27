import type { PersonaApi } from 'contracts/contracts/persona';
import type { NewPersona } from 'core/dto';
import { ipcRenderer } from 'electron';

export const personaApi: PersonaApi = {
    getAll: () => {
        return ipcRenderer.invoke('persona:getAll');
    },
    getById: (id: string) => {
        return ipcRenderer.invoke('persona:getById', id);
    },
    getByName: (name: string) => {
        return ipcRenderer.invoke('persona:getByName', name);
    },
    create: (newPersona: NewPersona) => {
        return ipcRenderer.invoke('persona:create', newPersona);
    },
    update: (id: string, updates: Partial<NewPersona>) => {
        return ipcRenderer.invoke('persona:update', id, updates);
    },
    delete: (id: string) => {
        return ipcRenderer.invoke('persona:delete', id);
    },
};
