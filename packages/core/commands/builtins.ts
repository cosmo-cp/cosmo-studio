import type { CommandDefinition } from '../dto';

// Provide built-in commands that ship with the app.
export const builtInCommands: CommandDefinition[] = [
    {
        name: '/summarize',
        description: 'Summarize the current conversation.',
        template: 'Summarize the current conversation in a few bullet points.',
        argumentLabel: 'Focus (optional)',
        builtIn: true,
    },
];
