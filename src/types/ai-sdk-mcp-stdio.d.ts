declare module "@ai-sdk/mcp/mcp-stdio" {
    export class Experimental_StdioMCPTransport {
        constructor(options: {
            command: string;
            args?: string[];
            env?: Record<string, string>;
            cwd?: string;
        });
    }
}
