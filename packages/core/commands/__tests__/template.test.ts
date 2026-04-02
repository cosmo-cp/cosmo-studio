import { describe, expect, it } from 'vitest';
import { renderCommandTemplate } from '../template';

describe('renderCommandTemplate', () => {
    it('returns the template when no argument is provided', () => {
        expect(renderCommandTemplate('Summarize the chat.')).toBe('Summarize the chat.');
    });

    it('injects the argument into the template placeholder', () => {
        expect(renderCommandTemplate('Summarize {{input}}.', 'this response')).toBe('Summarize this response.');
    });

    it('appends the argument when no placeholder exists', () => {
        expect(renderCommandTemplate('Summarize the chat.', 'focus on decisions')).toBe(
            'Summarize the chat.\n\nfocus on decisions',
        );
    });
});
