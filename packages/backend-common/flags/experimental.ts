import { evaluate, flag } from 'flags/next';

// Share one database read across all flags evaluated in a request.
export function createDatabaseFlags(read: () => Promise<Record<string, boolean>>) {
    const adapter = {
        adapterId: Symbol('database-flags'),
        decide: async function ({ key }: { key: string }) {
            const values = await read();
            return values[key] ?? false;
        },
        bulkDecide: async function ({ flags }: { flags: { key: string }[] }) {
            const values = await read();
            return Object.fromEntries(
                flags.map(({ key }) => {
                    return [key, values[key] ?? false];
                }),
            );
        },
    };
    return {
        tasks: flag<boolean>({ key: 'tasks', adapter: adapter }),
        workflow: flag<boolean>({ key: 'workflow', adapter: adapter }),
    };
}

// A fresh request confines SDK caching to a single evaluation.
export async function evaluateExperimentalFlags(read: () => Promise<Record<string, boolean>>) {
    return evaluate(createDatabaseFlags(read), new Request('http://localhost/experimental-flags'));
}
