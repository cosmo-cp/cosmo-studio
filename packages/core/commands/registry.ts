import type { Command, CommandDefinition } from '../dto';
import { builtInCommands } from './builtins';
import { normalizeCommandName } from './parser';

const normalizeDefinition = (command: Command | CommandDefinition, builtIn: boolean): CommandDefinition => ({
    id: 'id' in command ? command.id : undefined,
    name: normalizeCommandName(command.name),
    description: command.description,
    template: command.template,
    argumentLabel: command.argumentLabel ?? undefined,
    builtIn,
});

// Merge built-in commands with user-defined commands for display and execution.
export const mergeCommands = (userCommands: Command[]): CommandDefinition[] => {
    const normalizedBuiltIns = builtInCommands.map((command) => normalizeDefinition(command, true));
    const normalizedUserCommands = userCommands.map((command) => normalizeDefinition(command, false));
    const uniqueByName = new Map<string, CommandDefinition>();

    for (const command of normalizedBuiltIns) {
        uniqueByName.set(command.name, command);
    }

    for (const command of normalizedUserCommands) {
        if (!uniqueByName.has(command.name)) {
            uniqueByName.set(command.name, command);
        }
    }

    return Array.from(uniqueByName.values());
};

// Find a command by name across both built-in and user-defined sets.
export const findCommand = (allCommands: CommandDefinition[], name: string): CommandDefinition | undefined => {
    const normalizedName = normalizeCommandName(name);
    return allCommands.find((command) => command.name === normalizedName);
};
