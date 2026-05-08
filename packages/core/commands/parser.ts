export interface ParsedCommand {
    name: string;
    argument?: string;
}

// Normalize the name to ensure a leading slash and consistent casing.
export const normalizeCommandName = (value: string): string => {
    const trimmed = value.trim();
    if (!trimmed) {
        return '';
    }
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
};

// Parse the input into a single command name and optional argument.
export const parseCommandInput = (input: string): ParsedCommand | null => {
    const trimmed = input.trim();
    if (!trimmed.startsWith('/')) {
        return null;
    }

    const [rawName, ...rest] = trimmed.split(/\s+/);
    const name = normalizeCommandName(rawName);
    if (!name || name.length < 2) {
        return null;
    }

    const argument = rest.length > 0 ? rest.join(' ').trim() : undefined;
    return {
        name,
        argument: argument && argument.length > 0 ? argument : undefined,
    };
};
