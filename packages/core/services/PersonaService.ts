import { inject, injectable } from 'inversify';
import { NewPersona, Persona } from '../dto';
import { PersonaRepository } from '../repositories/PersonaRepository';
import { CORETYPES } from '../types/types';

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
        const rawPrompt = data.systemPrompt ?? data.details;
        const prompt = normalizeRequired(rawPrompt, 'Details or system prompt');

        return this.personaRepository.create({
            ...data,
            name: name,
            details: prompt,
            systemPrompt: prompt,
            skills: data.skills ?? [],
            toolAccessMode: data.toolAccessMode ?? 'all',
            allowedMcpServers: data.allowedMcpServers ?? [],
            allowedTools: data.allowedTools ?? [],
            webSearchEnabled: data.webSearchEnabled ?? true,
        });
    }

    public async update(id: string, updates: Partial<NewPersona>): Promise<Persona> {
        const normalizedUpdates: Partial<NewPersona> = {
            ...updates,
        };

        if (updates.name !== undefined) {
            normalizedUpdates.name = normalizeRequired(updates.name, 'Name');
        }

        if (updates.systemPrompt !== undefined || updates.details !== undefined) {
            const rawPrompt = updates.systemPrompt ?? updates.details;
            const prompt = normalizeRequired(rawPrompt, 'Details or system prompt');
            normalizedUpdates.details = prompt;
            normalizedUpdates.systemPrompt = prompt;
        }

        return this.personaRepository.update(id, normalizedUpdates);
    }

    public async delete(id: string): Promise<void> {
        return this.personaRepository.delete(id);
    }
}
