import type { NewPersona, Persona } from '../../../packages/core/dto';
import { callRpc } from '../api/common';
import type { PersonaApi } from '../contracts/persona';

export const personaHttpApi: PersonaApi = {
    getAll: () => {
        return callRpc<Persona[]>('persona', 'getAll', []);
    },
    getById: (id: string) => {
        return callRpc<Persona | undefined>('persona', 'getById', [id]);
    },
    getByName: (name: string) => {
        return callRpc<Persona | undefined>('persona', 'getByName', [name]);
    },
    create: (newPersona: NewPersona) => {
        return callRpc<Persona>('persona', 'create', [newPersona]);
    },
    update: (id: string, updates: Partial<NewPersona>) => {
        return callRpc<Persona>('persona', 'update', [id, updates]);
    },
    delete: (id: string) => {
        return callRpc<void>('persona', 'delete', [id]);
    },
};
