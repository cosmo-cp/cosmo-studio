import { describe, expect, it, vi } from 'vitest';
import { CommandController } from '../CommandController';
import type { CommandDefinition, CommandExecution } from 'core/dto';

describe('CommandController', () => {
    it('returns the list of commands from the service', async () => {
        const commands: CommandDefinition[] = [
            {
                name: '/summarize',
                description: 'Summarize the chat.',
                template: 'Summarize the chat.',
                builtIn: true,
            },
        ];
        const service = {
            listAll: vi.fn().mockResolvedValue(commands),
        };

        const controller = new CommandController(service as never);
        await expect(controller.listAll()).resolves.toEqual(commands);
    });

    it('executes a command via the service', async () => {
        const execution: CommandExecution = {
            name: '/summarize',
            resolvedText: 'Summarize the chat.',
        };
        const service = {
            execute: vi.fn().mockResolvedValue(execution),
        };

        const controller = new CommandController(service as never);
        await expect(controller.execute({ input: '/summarize' })).resolves.toEqual(execution);
    });
});
