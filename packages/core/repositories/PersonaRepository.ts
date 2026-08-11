import { asc, eq } from 'drizzle-orm';
import { inject, injectable } from 'inversify';
import { DatabaseManager } from '../database/DatabaseManager';
import { persona } from '../database/schema/schema';
import { NewPersona, Persona } from '../dto';
import { CORETYPES } from '../types/types';

@injectable()
export class PersonaRepository {
    private db;

    constructor(@inject(CORETYPES.DatabaseManager) databaseManager: DatabaseManager) {
        this.db = databaseManager.getInstance();
    }

    public async getAll(): Promise<Persona[]> {
        return this.db.select().from(persona).orderBy(asc(persona.name));
    }

    public async getById(id: string): Promise<Persona | undefined> {
        const result = await this.db.select().from(persona).where(eq(persona.id, id)).limit(1);
        return result[0];
    }

    public async getByName(name: string): Promise<Persona | undefined> {
        const result = await this.db.select().from(persona).where(eq(persona.name, name)).limit(1);
        return result[0];
    }

    public async create(data: NewPersona): Promise<Persona> {
        const now = new Date();
        const [createdPersona] = await this.db
            .insert(persona)
            .values({
                ...data,
                createdAt: data.createdAt ?? now,
                updatedAt: data.updatedAt ?? now,
            })
            .returning();
        return createdPersona;
    }

    public async update(id: string, updates: Partial<NewPersona>): Promise<Persona> {
        const [updatedPersona] = await this.db
            .update(persona)
            .set({
                ...updates,
                updatedAt: new Date(),
            })
            .where(eq(persona.id, id))
            .returning();
        return updatedPersona;
    }

    public async delete(id: string): Promise<void> {
        await this.db.delete(persona).where(eq(persona.id, id));
    }
}
