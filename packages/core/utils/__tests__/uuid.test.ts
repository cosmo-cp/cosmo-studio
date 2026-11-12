import { describe, expect, it } from 'vitest';
import { isValidUuid } from '../uuid';

describe('isValidUuid', () => {
    it('returns true for standard valid UUIDs', () => {
        expect(isValidUuid('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')).toBe(true);
        expect(isValidUuid('00000000-0000-0000-0000-000000000000')).toBe(true);
        expect(isValidUuid('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
    });

    it('returns false for file paths or random strings', () => {
        expect(isValidUuid('/Users/gauravsaini/repos/cosmocp-desktop')).toBe(false);
        expect(isValidUuid('~/projects/my-app')).toBe(false);
        expect(isValidUuid('not-a-uuid')).toBe(false);
        expect(isValidUuid('')).toBe(false);
        expect(isValidUuid(null)).toBe(false);
        expect(isValidUuid(undefined)).toBe(false);
        expect(isValidUuid(123)).toBe(false);
    });
});
