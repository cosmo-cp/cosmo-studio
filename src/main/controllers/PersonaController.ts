import { inject, injectable } from 'inversify';
import { IpcController, IpcHandler } from '../ipc/Decorators';
import { CORETYPES } from 'core/types/types';
import { PersonaService } from 'core/services/PersonaService';
import { Controller } from './Controller';
import { NewPersona, Persona } from 'core/dto';

@injectable()
@IpcController('persona')
export class PersonaController implements Controller {
    constructor(@inject(CORETYPES.PersonaService) private personaService: PersonaService) {}

    @IpcHandler('getAll')
    public async getAll(): Promise<Persona[]> {
        return this.personaService.getAll();
    }

    @IpcHandler('getById')
    public async getById(id: string): Promise<Persona | undefined> {
        return this.personaService.getById(id);
    }

    @IpcHandler('getByName')
    public async getByName(name: string): Promise<Persona | undefined> {
        return this.personaService.getByName(name);
    }

    @IpcHandler('create')
    public async create(newPersona: NewPersona): Promise<Persona> {
        return this.personaService.create(newPersona);
    }

    @IpcHandler('update')
    public async update(id: string, updates: Partial<NewPersona>): Promise<Persona> {
        return this.personaService.update(id, updates);
    }

    @IpcHandler('delete')
    public async delete(id: string): Promise<void> {
        return this.personaService.delete(id);
    }
}
