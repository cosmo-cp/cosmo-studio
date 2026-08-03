import {describe, expect, it} from 'vitest';
import type {Message} from './dto';
import {toUiMessages} from './uiMessageMapper';

describe('toUiMessages', () => {
    it('maps text, reasoning, metadata, and legacy null roles', () => {
        const messages = [
            {
                id: 'user-message',
                role: null,
                text: 'hello',
                reasoning: null,
                modelIdentifier: null,
            },
            {
                id: 'assistant-message',
                role: 'assistant',
                text: 'answer',
                reasoning: 'steps',
                modelIdentifier: 'openai:gpt-4o',
            },
        ] as Message[];

        expect(toUiMessages(messages)).toEqual([
            {
                id: 'user-message',
                role: 'user',
                parts: [{type: 'text', text: 'hello'}],
            },
            {
                id: 'assistant-message',
                role: 'assistant',
                parts: [
                    {type: 'text', text: 'answer'},
                    {type: 'reasoning', text: 'steps'},
                ],
                metadata: {modelId: 'openai:gpt-4o'},
            },
        ]);
    });
});
