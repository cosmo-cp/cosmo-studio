import type { CommandCreateInput, CommandDefinition, CommandExecution, CommandUpdateInput } from 'core/dto';
import { getCoreLogger } from 'core/platform/CoreLogger';
import { CommandService } from 'core/services/CommandService';
import { CORETYPES } from 'core/types/types';
import { inject, injectable } from 'inversify';
import { z } from 'zod';
import { IpcController, IpcHandler } from '../ipc/Decorators';
import { Controller } from './Controller';

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
    @IpcHandler('listAll', z.tuple([]))
    public async listAll(): Promise<CommandDefinition[]> {
        return this.commandService.listAll();
    }

    // Create a new user-defined command from validated inputs.
    @IpcHandler('create', z.tuple([commandCreateSchema]))
    public async create(input: CommandCreateInput): Promise<CommandDefinition> {
        const parsed = commandCreateSchema.parse(input);
        return this.commandService.create(parsed);
    }

    // Update an existing user-defined command after validation.
    @IpcHandler('update', z.tuple([z.string().min(1), commandUpdateSchema]))
    public async update(id: string, updates: CommandUpdateInput): Promise<CommandDefinition> {
        const parsed = commandUpdateSchema.parse(updates);
        return this.commandService.update(id, parsed);
    }

    // Remove a user-defined command by id.
    @IpcHandler('delete', z.tuple([z.string().min(1)]))
    public async delete(id: string): Promise<void> {
        return this.commandService.delete(id);
    }

    // Resolve a command into its final prompt text for chat execution.
    @IpcHandler('execute', z.tuple([commandExecuteSchema]))
    public async execute(input: { input: string }): Promise<CommandExecution> {
        const parsed = commandExecuteSchema.parse(input);
        try {
            return await this.commandService.execute(parsed.input);
        } catch (error) {
            getCoreLogger().error('Failed to execute command', error);
            throw error;
        }
    }
}
