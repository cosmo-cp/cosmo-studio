import { inject, injectable } from 'inversify';
import { z } from 'zod';
import { IpcController, IpcHandler } from '../ipc/Decorators';
import { CORETYPES } from 'core/types/types';
import { PersonaService } from 'core/services/PersonaService';
import { Controller } from './Controller';
import type { NewPersona, Persona } from 'core/dto';

const newPersonaSchema = z.custom<NewPersona>();
const personaUpdateSchema = z.custom<Partial<NewPersona>>();

@injectable()
@IpcController('persona')
export class PersonaController implements Controller {
    constructor(@inject(CORETYPES.PersonaService) private personaService: PersonaService) {}

    @IpcHandler('getAll', z.tuple([]))
    public async getAll(): Promise<Persona[]> {
        return this.personaService.getAll();
    }

    @IpcHandler('getById', z.tuple([z.string().min(1)]))
    public async getById(id: string): Promise<Persona | undefined> {
        return this.personaService.getById(id);
    }

    @IpcHandler('getByName', z.tuple([z.string().min(1)]))
    public async getByName(name: string): Promise<Persona | undefined> {
        return this.personaService.getByName(name);
    }

    @IpcHandler('create', z.tuple([newPersonaSchema]))
    public async create(newPersona: NewPersona): Promise<Persona> {
        return this.personaService.create(newPersona);
    }

    @IpcHandler('update', z.tuple([z.string().min(1), personaUpdateSchema]))
    public async update(id: string, updates: Partial<NewPersona>): Promise<Persona> {
        return this.personaService.update(id, updates);
    }

    @IpcHandler('delete', z.tuple([z.string().min(1)]))
    public async delete(id: string): Promise<void> {
        return this.personaService.delete(id);
    }
}
