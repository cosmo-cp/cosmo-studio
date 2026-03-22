import { inject, injectable } from 'inversify';
import { z } from 'zod';
import { IpcController, IpcHandler } from '../ipc/Decorators';
import { CORETYPES } from 'core/types/types';
import { CommandService } from 'core/services/CommandService';
import type { CommandCreateInput, CommandDefinition, CommandExecution, CommandUpdateInput } from 'core/dto';
import { Controller } from './Controller';
import { logger } from '../logger';

const commandCreateSchema = z.object({
    name: z.string().min(1),
    description: z.string().min(1),
    template: z.string().min(1),
    argumentLabel: z.string().optional().nullable(),
});

const commandUpdateSchema = z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    template: z.string().optional(),
    argumentLabel: z.string().optional().nullable(),
});

const commandExecuteSchema = z.object({
    input: z.string().min(1),
});

@injectable()
@IpcController('command')
export class CommandController implements Controller {
    constructor(
        @inject(CORETYPES.CommandService)
        private commandService: CommandService,
    ) {}

    // Provide commands to the renderer for discovery and selection.
    @IpcHandler('listAll')
    public async listAll(): Promise<CommandDefinition[]> {
        return this.commandService.listAll();
    }

    // Create a new user-defined command from validated inputs.
    @IpcHandler('create')
    public async create(input: CommandCreateInput): Promise<CommandDefinition> {
        const parsed = commandCreateSchema.parse(input);
        return this.commandService.create(parsed);
    }

    // Update an existing user-defined command after validation.
    @IpcHandler('update')
    public async update(id: string, updates: CommandUpdateInput): Promise<CommandDefinition> {
        const parsed = commandUpdateSchema.parse(updates);
        return this.commandService.update(id, parsed);
    }

    // Remove a user-defined command by id.
    @IpcHandler('delete')
    public async delete(id: string): Promise<void> {
        return this.commandService.delete(id);
    }

    // Resolve a command into its final prompt text for chat execution.
    @IpcHandler('execute')
    public async execute(input: { input: string }): Promise<CommandExecution> {
        const parsed = commandExecuteSchema.parse(input);
        try {
            return await this.commandService.execute(parsed.input);
        } catch (error) {
            logger.error('Failed to execute command', error);
            throw error;
        }
    }
}
