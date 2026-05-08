import { describe, expect, it } from 'vitest';
import { normalizeCommandName, parseCommandInput } from '../parser';

describe('parseCommandInput', () => {
    it('normalizes names with a leading slash', () => {
        expect(normalizeCommandName('summarize')).toBe('/summarize');
    });

    it('returns null for non-command input', () => {
        expect(parseCommandInput('hello world')).toBeNull();
    });

    it('parses a command without an argument', () => {
        expect(parseCommandInput('/summarize')).toEqual({
            name: '/summarize',
            argument: undefined,
        });
    });

    it('parses a command with a single argument', () => {
        expect(parseCommandInput('/summarize focus on key points')).toEqual({
            name: '/summarize',
            argument: 'focus on key points',
        });
    });
});
