import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { isProtectedRoot, validateAndCanonicalizePath } from '../pathSecurity';

describe('pathSecurity', () => {
    let tempDir: string;
    let tempFile: string;

    beforeAll(async () => {
        tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'cosmo-ws-test-'));
        tempFile = path.join(tempDir, 'test-file.txt');
        await fs.promises.writeFile(tempFile, 'hello');
    });

    afterAll(async () => {
        await fs.promises.rm(tempDir, { recursive: true, force: true });
    });

    describe('isProtectedRoot', () => {
        it('returns true for falsy/empty paths', () => {
            expect(isProtectedRoot('')).toBe(true);
        });

        it('returns true for direct root directory', () => {
            const root = path.parse(process.cwd()).root;
            expect(isProtectedRoot(root)).toBe(true);
        });

        it('returns true for direct home directory', () => {
            expect(isProtectedRoot(os.homedir())).toBe(true);
        });

        it('returns true for sensitive credential directories', () => {
            const home = os.homedir();
            expect(isProtectedRoot(path.join(home, '.ssh'))).toBe(true);
            expect(isProtectedRoot(path.join(home, '.ssh', 'id_rsa'))).toBe(true);
            expect(isProtectedRoot(path.join(home, '.aws'))).toBe(true);
            expect(isProtectedRoot(path.join(home, '.gnupg'))).toBe(true);
        });

        it('returns true for protected system directories', () => {
            if (process.platform !== 'win32') {
                expect(isProtectedRoot('/etc')).toBe(true);
                expect(isProtectedRoot('/etc/hosts')).toBe(true);
                expect(isProtectedRoot('/var')).toBe(true);
                expect(isProtectedRoot('/usr')).toBe(true);
            }
        });

        it('returns false for normal project directory', () => {
            expect(isProtectedRoot(tempDir)).toBe(false);
        });
    });

    describe('validateAndCanonicalizePath', () => {
        it('rejects empty or whitespace path', async () => {
            const res1 = await validateAndCanonicalizePath('');
            expect(res1.isValid).toBe(false);
            expect(res1.error).toContain('Path must not be empty');

            const res2 = await validateAndCanonicalizePath('   ');
            expect(res2.isValid).toBe(false);
            expect(res2.error).toContain('Path must not be empty');
        });

        it('rejects relative path', async () => {
            const res = await validateAndCanonicalizePath('relative/path');
            expect(res.isValid).toBe(false);
            expect(res.error).toContain('absolute filesystem path');
        });

        it('rejects non-existent directory', async () => {
            const nonExistent = path.join(tempDir, 'does-not-exist-' + Date.now());
            const res = await validateAndCanonicalizePath(nonExistent);
            expect(res.isValid).toBe(false);
            expect(res.error).toContain('Directory does not exist');
        });

        it('rejects a file path', async () => {
            const res = await validateAndCanonicalizePath(tempFile);
            expect(res.isValid).toBe(false);
            expect(res.error).toContain('Path is not a directory');
        });

        it('rejects protected root directory', async () => {
            const res = await validateAndCanonicalizePath(os.homedir());
            expect(res.isValid).toBe(false);
            expect(res.error).toContain('prohibited');
        });

        it('accepts and canonicalizes valid directory', async () => {
            const res = await validateAndCanonicalizePath(tempDir);
            expect(res.isValid).toBe(true);
            expect(res.canonicalPath).toBeDefined();
            expect(path.isAbsolute(res.canonicalPath!)).toBe(true);
        });

        it('supports tilde expansion', async () => {
            // Test with a subdirectory in homedir if available, or mock
            const projectDirInHome = path.join(os.homedir(), '.cosmo-test-dir-' + Date.now());
            await fs.promises.mkdir(projectDirInHome, { recursive: true });
            try {
                const tildePath = '~/' + path.basename(projectDirInHome);
                const res = await validateAndCanonicalizePath(tildePath);
                expect(res.isValid).toBe(true);
                expect(res.canonicalPath).toBe(await fs.promises.realpath(projectDirInHome));
            } finally {
                await fs.promises.rm(projectDirInHome, { recursive: true, force: true });
            }
        });
    });
});
