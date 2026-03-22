import { inject, injectable } from 'inversify';
import { CORETYPES } from '../types/types';
import { PersonaRepository } from '../repositories/PersonaRepository';
import { NewPersona, Persona } from '../dto';

const normalizeRequired = (value: string | null | undefined, field: string) => {
    if (!value || value.trim().length === 0) {
        throw new Error(`${field} is required.`);
    }

    return value.trim();
};

@injectable()
export class PersonaService {
    constructor(@inject(CORETYPES.PersonaRepository) private personaRepository: PersonaRepository) {}

    public async getAll(): Promise<Persona[]> {
        return this.personaRepository.getAll();
    }

    public async getById(id: string): Promise<Persona | undefined> {
        return this.personaRepository.getById(id);
    }

    public async getByName(name: string): Promise<Persona | undefined> {
        return this.personaRepository.getByName(name);
    }

    public async create(data: NewPersona): Promise<Persona> {
        const name = normalizeRequired(data.name, 'Name');
        const details = normalizeRequired(data.details, 'Details');
        return this.personaRepository.create({
            ...data,
            name,
            details,
        });
    }

    public async update(id: string, updates: Partial<NewPersona>): Promise<Persona> {
        const normalizedUpdates: Partial<NewPersona> = {
            ...updates,
        };

        if (updates.name !== undefined) {
            normalizedUpdates.name = normalizeRequired(updates.name, 'Name');
        }

        if (updates.details !== undefined) {
            normalizedUpdates.details = normalizeRequired(updates.details, 'Details');
        }

        return this.personaRepository.update(id, normalizedUpdates);
    }

    public async delete(id: string): Promise<void> {
        return this.personaRepository.delete(id);
    }
}
