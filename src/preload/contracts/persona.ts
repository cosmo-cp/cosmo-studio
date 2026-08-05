import type { NewPersona, Persona } from '../../../packages/core/dto';

export interface PersonaApi {
    getAll(): Promise<Persona[]>;
    getById(id: string): Promise<Persona | undefined>;
    getByName(name: string): Promise<Persona | undefined>;
    create(newPersona: NewPersona): Promise<Persona>;
    update(id: string, updates: Partial<NewPersona>): Promise<Persona>;
    delete(id: string): Promise<void>;
}
