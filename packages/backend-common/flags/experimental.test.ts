import { describe, expect, it, vi } from 'vitest';
import { createDatabaseFlags, evaluateExperimentalFlags } from './experimental';

describe('database flags adapter', () => {
    it('evaluates all flags outside Next request scope and defaults missing values to disabled', async () => {
        const read = vi.fn().mockResolvedValue({ tasks: false });
        await expect(evaluateExperimentalFlags(read)).resolves.toEqual({ tasks: false, workflow: false });
        expect(read).toHaveBeenCalledTimes(1);
    });
    it('supports individual evaluation with a fresh request', async () => {
        const flags = createDatabaseFlags(async () => {
            return { workflow: false };
        });
        const request = new Request('http://localhost/flags');
        await expect(flags.workflow(request)).resolves.toBe(false);
        await expect(flags.tasks(request)).resolves.toBe(false);
    });
    it('reads updated choices on subsequent evaluations', async () => {
        const read = vi.fn().mockResolvedValueOnce({ tasks: false }).mockResolvedValueOnce({ tasks: true });
        expect((await evaluateExperimentalFlags(read)).tasks).toBe(false);
        expect((await evaluateExperimentalFlags(read)).tasks).toBe(true);
    });
    it('propagates database failures', async () => {
        await expect(
            evaluateExperimentalFlags(async () => {
                throw new Error('database unavailable');
            }),
        ).rejects.toThrow();
    });
});
