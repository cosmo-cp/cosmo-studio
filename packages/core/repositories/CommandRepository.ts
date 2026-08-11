import { asc, eq } from 'drizzle-orm';
import { inject, injectable } from 'inversify';
import { DatabaseManager } from '../database/DatabaseManager';
import { command } from '../database/schema/schema';
import { Command, NewCommand } from '../dto';
import { CORETYPES } from '../types/types';

@injectable()
export class CommandRepository {
    private db;

    constructor(@inject(CORETYPES.DatabaseManager) databaseManager: DatabaseManager) {
        this.db = databaseManager.getInstance();
    }

    // Provide a consistent list order for UI rendering and conflict checks.
    public async getAll(): Promise<Command[]> {
        return this.db.select().from(command).orderBy(asc(command.name));
    }

    // Locate a specific command by id for edit and delete workflows.
    public async getById(id: string): Promise<Command | undefined> {
        const result = await this.db.select().from(command).where(eq(command.id, id)).limit(1);
        return result[0];
    }

    // Allow name collision checks before creating or renaming commands.
    public async getByName(name: string): Promise<Command | undefined> {
        const result = await this.db.select().from(command).where(eq(command.name, name)).limit(1);
        return result[0];
    }

    // Persist new user-defined commands.
    public async create(data: NewCommand): Promise<Command> {
        const now = new Date();
        const [createdCommand] = await this.db
            .insert(command)
            .values({
                ...data,
                createdAt: data.createdAt ?? now,
                updatedAt: data.updatedAt ?? now,
            })
            .returning();
        return createdCommand;
    }

    // Update command metadata and templates while tracking modification time.
    public async update(id: string, updates: Partial<NewCommand>): Promise<Command> {
        const [updatedCommand] = await this.db
            .update(command)
            .set({
                ...updates,
                updatedAt: new Date(),
            })
            .where(eq(command.id, id))
            .returning();
        return updatedCommand;
    }

    // Remove a user-defined command.
    public async delete(id: string): Promise<void> {
        await this.db.delete(command).where(eq(command.id, id));
    }
}
