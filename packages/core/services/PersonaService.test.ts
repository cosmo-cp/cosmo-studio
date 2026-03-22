import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NewPersona, Persona } from '../dto';
import type { PersonaRepository } from '../repositories/PersonaRepository';
import { PersonaService } from './PersonaService';

describe('PersonaService', () => {
    let repository: PersonaRepository;
    let service: PersonaService;

    beforeEach(() => {
        repository = {
            getAll: vi.fn(),
            getById: vi.fn(),
            getByName: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        } as unknown as PersonaRepository;
        service = new PersonaService(repository);
    });

    it('trims required fields on create', async () => {
        const created = { id: 'p', name: 'Name', details: 'Details' } as unknown as Persona;
        (repository.create as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(created);

        const input: NewPersona = { name: '  Name  ', details: '  Details  ' } as unknown as NewPersona;
        const result = await service.create(input);

        expect(repository.create).toHaveBeenCalledWith({
            ...input,
            name: 'Name',
            details: 'Details',
        });
        expect(result).toBe(created);
    });

    it.each([
        ['name is empty', { name: '   ', details: 'x' }, 'Name is required.'],
        ['details is empty', { name: 'x', details: '   ' }, 'Details is required.'],
    ])('rejects create when %s', async (_label, input, message) => {
        await expect(service.create(input as unknown as NewPersona)).rejects.toThrow(message);
        expect(repository.create).not.toHaveBeenCalled();
    });

    it('normalizes only the provided fields on update', async () => {
        const updated = { id: 'p', name: 'Name', details: 'Details' } as unknown as Persona;
        (repository.update as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(updated);

        await service.update('p', { details: '  New details  ' } as Partial<NewPersona>);
        expect(repository.update).toHaveBeenCalledWith('p', { details: 'New details' });

        await service.update('p', { name: '  New name  ' } as Partial<NewPersona>);
        expect(repository.update).toHaveBeenCalledWith('p', { name: 'New name' });
    });

    it('rejects update when provided required fields are empty', async () => {
        await expect(service.update('p', { name: '   ' } as Partial<NewPersona>)).rejects.toThrow('Name is required.');
        await expect(service.update('p', { details: '' } as Partial<NewPersona>)).rejects.toThrow(
            'Details is required.',
        );
        expect(repository.update).not.toHaveBeenCalled();
    });

    it('delegates reads and deletes', async () => {
        const personas: Persona[] = [{ id: 'p' } as Persona];
        (repository.getAll as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(personas);
        (repository.getById as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(personas[0]);
        (repository.getByName as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(personas[0]);

        await expect(service.getAll()).resolves.toEqual(personas);
        expect(repository.getAll).toHaveBeenCalledTimes(1);

        await expect(service.getById('p')).resolves.toEqual(personas[0]);
        expect(repository.getById).toHaveBeenCalledWith('p');

        await expect(service.getByName('Name')).resolves.toEqual(personas[0]);
        expect(repository.getByName).toHaveBeenCalledWith('Name');

        await service.delete('p');
        expect(repository.delete).toHaveBeenCalledWith('p');
    });
});
