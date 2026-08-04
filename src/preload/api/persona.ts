import { ipcRenderer } from 'electron';
import type { NewPersona, Persona } from '../../../packages/core/dto';
import { callRpc } from './common';

export interface PersonaApi {
    getAll(): Promise<Persona[]>;

    getById(id: string): Promise<Persona | undefined>;

    getByName(name: string): Promise<Persona | undefined>;

    create(newPersona: NewPersona): Promise<Persona>;

    update(id: string, updates: Partial<NewPersona>): Promise<Persona>;

    delete(id: string): Promise<void>;
}

export const personaRpcApi: PersonaApi = {
    getAll: () => ipcRenderer.invoke('persona:getAll'),
    getById: (id: string) => ipcRenderer.invoke('persona:getById', id),
    getByName: (name: string) => ipcRenderer.invoke('persona:getByName', name),
    create: (newPersona: NewPersona) => ipcRenderer.invoke('persona:create', newPersona),
    update: (id: string, updates: Partial<NewPersona>) => ipcRenderer.invoke('persona:update', id, updates),
    delete: (id: string) => ipcRenderer.invoke('persona:delete', id),
};

export const personaHttpApi: PersonaApi = {
    getAll: () => callRpc<Persona[]>('persona', 'getAll', []),
    getById: (id: string) => callRpc<Persona | undefined>('persona', 'getById', [id]),
    getByName: (name: string) => callRpc<Persona | undefined>('persona', 'getByName', [name]),
    create: (newPersona: NewPersona) => callRpc<Persona>('persona', 'create', [newPersona]),
    update: (id: string, updates: Partial<NewPersona>) => callRpc<Persona>('persona', 'update', [id, updates]),
    delete: (id: string) => callRpc<void>('persona', 'delete', [id]),
};
