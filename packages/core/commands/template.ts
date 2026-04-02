// Build a prompt string from a command template and optional argument.
export const renderCommandTemplate = (template: string, argument?: string): string => {
    if (!argument) {
        return template.trim();
    }

    if (template.includes('{{input}}')) {
        return template.replace('{{input}}', argument).trim();
    }

    return `${template.trim()}\n\n${argument.trim()}`.trim();
};
