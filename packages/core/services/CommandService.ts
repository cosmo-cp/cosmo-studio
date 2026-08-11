import { inject, injectable } from 'inversify';
import { normalizeCommandName, parseCommandInput } from '../commands/parser';
import { findCommand, mergeCommands } from '../commands/registry';
import { renderCommandTemplate } from '../commands/template';
import { Command, CommandCreateInput, CommandDefinition, CommandExecution, CommandUpdateInput } from '../dto';
import { CommandRepository } from '../repositories/CommandRepository';
import { CORETYPES } from '../types/types';

// Ensure required text inputs are present before persistence.
const normalizeRequired = (value: string | null | undefined, field: string) => {
    if (!value || value.trim().length === 0) {
        throw new Error(`${field} is required.`);
    }

    return value.trim();
};

@injectable()
export class CommandService {
    constructor(
        @inject(CORETYPES.CommandRepository)
        private commandRepository: CommandRepository,
    ) {}

    // Provide a combined list of built-in and user-defined commands.
    public async listAll(): Promise<CommandDefinition[]> {
        const userCommands = await this.commandRepository.getAll();
        return mergeCommands(userCommands);
    }

    // Persist a new user-defined command with validation and normalization.
    public async create(input: CommandCreateInput): Promise<CommandDefinition> {
        const name = normalizeCommandName(normalizeRequired(input.name, 'Name'));
        if (name.length < 2) {
            throw new Error('Command name must start with / and include at least one character.');
        }

        const description = normalizeRequired(input.description, 'Description');
        const template = normalizeRequired(input.template, 'Template');
        const argumentLabel = input.argumentLabel?.trim() || null;

        const allCommands = await this.listAll();
        const existing = findCommand(allCommands, name);
        if (existing) {
            throw new Error(`Command "${name}" already exists.`);
        }

        const created = await this.commandRepository.create({
            name: name,
            description: description,
            template: template,
            argumentLabel: argumentLabel,
        });

        return {
            id: created.id,
            name: created.name,
            description: created.description,
            template: created.template,
            argumentLabel: created.argumentLabel,
            builtIn: false,
        };
    }

    // Update a user-defined command and keep it distinct from built-ins.
    public async update(id: string, updates: CommandUpdateInput): Promise<CommandDefinition> {
        const existing = await this.commandRepository.getById(id);
        if (!existing) {
            throw new Error('Command not found.');
        }

        const normalizedUpdates: CommandUpdateInput = {
            ...updates,
        };

        if (updates.name !== undefined) {
            const name = normalizeCommandName(normalizeRequired(updates.name, 'Name'));
            normalizedUpdates.name = name;
            const allCommands = await this.listAll();
            const match = findCommand(allCommands, name);
            if (match && match.id !== existing.id) {
                throw new Error(`Command "${name}" already exists.`);
            }
        }

        if (updates.description !== undefined) {
            normalizedUpdates.description = normalizeRequired(updates.description, 'Description');
        }

        if (updates.template !== undefined) {
            normalizedUpdates.template = normalizeRequired(updates.template, 'Template');
        }

        if (updates.argumentLabel !== undefined) {
            normalizedUpdates.argumentLabel = updates.argumentLabel?.trim() || null;
        }

        const updated = await this.commandRepository.update(existing.id, normalizedUpdates);

        return {
            id: updated.id,
            name: updated.name,
            description: updated.description,
            template: updated.template,
            argumentLabel: updated.argumentLabel,
            builtIn: false,
        };
    }

    // Remove a user-defined command by id.
    public async delete(id: string): Promise<void> {
        const existing = await this.commandRepository.getById(id);
        if (!existing) {
            throw new Error('Command not found.');
        }
        await this.commandRepository.delete(id);
    }

    // Translate a command string into a resolved prompt to send.
    public async execute(input: string): Promise<CommandExecution> {
        const parsed = parseCommandInput(input);
        if (!parsed) {
            throw new Error('Invalid command.');
        }

        const allCommands = await this.listAll();
        const command = findCommand(allCommands, parsed.name);
        if (!command) {
            throw new Error(`Command "${parsed.name}" not found.`);
        }

        const resolvedText = renderCommandTemplate(command.template, parsed.argument);
        return {
            name: command.name,
            argument: parsed.argument,
            resolvedText: resolvedText,
        };
    }

    // Provide all user-defined commands for management screens.
    public async listUserCommands(): Promise<Command[]> {
        return this.commandRepository.getAll();
    }
}
