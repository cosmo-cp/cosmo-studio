import { describe, expect, it, vi } from 'vitest';
import type { NewPersona, Persona } from 'core/dto';
import type { PersonaService } from 'core/services/PersonaService';
import { PersonaController } from './PersonaController';

describe('PersonaController', () => {
    it('delegates persona operations to the service', async () => {
        const personas: Persona[] = [{ id: 'p' } as Persona];
        const created = { id: 'p', name: 'Name', details: 'Details' } as Persona;
        const updated = { id: 'p', name: 'Name', details: 'Updated' } as Persona;

        const service = {
            getAll: vi.fn().mockResolvedValue(personas),
            getById: vi.fn().mockResolvedValue(created),
            getByName: vi.fn().mockResolvedValue(created),
            create: vi.fn().mockResolvedValue(created),
            update: vi.fn().mockResolvedValue(updated),
            delete: vi.fn().mockResolvedValue(undefined),
        } as unknown as PersonaService;

        const controller = new PersonaController(service);

        await expect(controller.getAll()).resolves.toEqual(personas);
        expect(service.getAll).toHaveBeenCalledTimes(1);

        await expect(controller.getById('p')).resolves.toEqual(created);
        expect(service.getById).toHaveBeenCalledWith('p');

        await expect(controller.getByName('Name')).resolves.toEqual(created);
        expect(service.getByName).toHaveBeenCalledWith('Name');

        const newPersona: NewPersona = { name: 'Name', details: 'Details' } as unknown as NewPersona;
        await expect(controller.create(newPersona)).resolves.toEqual(created);
        expect(service.create).toHaveBeenCalledWith(newPersona);

        await expect(controller.update('p', { details: 'Updated' } as Partial<NewPersona>)).resolves.toEqual(updated);
        expect(service.update).toHaveBeenCalledWith('p', { details: 'Updated' });

        await controller.delete('p');
        expect(service.delete).toHaveBeenCalledWith('p');
    });
});
