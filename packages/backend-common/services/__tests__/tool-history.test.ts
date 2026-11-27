import { convertToModelMessages, type UIMessage } from 'ai';
import { describe, expect, it } from 'vitest';

describe('tool history conversion', () => {
    it('omits interrupted tool calls while retaining completed results', async () => {
        const messages: UIMessage[] = [
            { id: '1', role: 'user', parts: [{ type: 'text', text: 'Read files' }] },
            {
                id: '2',
                role: 'assistant',
                parts: [
                    {
                        type: 'dynamic-tool',
                        toolCallId: 'interrupted',
                        toolName: 'read',
                        state: 'input-available',
                        input: {},
                    },
                    {
                        type: 'dynamic-tool',
                        toolCallId: 'completed',
                        toolName: 'read',
                        state: 'output-available',
                        input: {},
                        output: 'contents',
                    },
                ],
            },
            { id: '3', role: 'user', parts: [{ type: 'text', text: 'Continue' }] },
        ];
        const result = await convertToModelMessages(messages, { ignoreIncompleteToolCalls: true });
        expect(JSON.stringify(result)).not.toContain('interrupted');
        expect(JSON.stringify(result)).toContain('completed');
        expect(JSON.stringify(result)).toContain('contents');
    });
});
