import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

describe('generate-api script', () => {
    it('includes the CommandController in the controller registry', () => {
        const scriptPath = path.resolve(__dirname, '../generate-api.ts');
        const content = fs.readFileSync(scriptPath, 'utf-8');
        expect(content).toContain('CommandController');
    });
});
