import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import path from 'node:path';
import * as tar from 'tar';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installAcpBinary, uninstallAcpBinary } from './AcpBinaryInstaller';

const target = `${process.platform === 'win32' ? 'windows' : process.platform}-${process.arch === 'arm64' ? 'aarch64' : process.arch === 'x64' ? 'x86_64' : process.arch}`;
describe('installAcpBinary', () => {
    let home: string;
    beforeEach(async () => {
        home = await mkdtemp(path.join(tmpdir(), 'acp-binary-test-'));
        vi.stubEnv('HOME', home);
        vi.stubEnv('USERPROFILE', home);
        expect(homedir()).toBe(home);
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('binary contents')));
    });
    afterEach(async () => {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
        await rm(home, { recursive: true, force: true });
    });
    it('downloads a raw executable and checks its digest', async () => {
        const sha256 = createHash('sha256').update('binary contents').digest('hex');
        const installed = await installAcpBinary({
            [target]: { archive: 'https://example.com/agent', cmd: './bin/agent', sha256: sha256, args: ['acp'] },
        });
        expect(await readFile(installed.command, 'utf8')).toBe('binary contents');
        expect(installed.args).toEqual(['acp']);
    });

    it('removes only the installed agent directory', async () => {
        const installed = await installAcpBinary({ [target]: { archive: 'https://example.com/agent', cmd: 'agent' } });
        await uninstallAcpBinary(path.join(home, 'outside'));
        expect(await readFile(installed.command, 'utf8')).toBe('binary contents');
        await uninstallAcpBinary(installed.command);
        await expect(readFile(installed.command)).rejects.toMatchObject({ code: 'ENOENT' });
        await expect(uninstallAcpBinary(installed.command)).resolves.toBeUndefined();
    });
    it('rejects invalid platform, unsafe command, and checksum mismatch', async () => {
        await expect(installAcpBinary({})).rejects.toThrow('No valid ACP binary');
        await expect(
            installAcpBinary({ [target]: { archive: 'https://example.com/a', cmd: '../agent' } }),
        ).rejects.toThrow('Invalid ACP binary');
        await expect(
            installAcpBinary({ [target]: { archive: 'https://example.com/a', cmd: 'agent', sha256: '0'.repeat(64) } }),
        ).rejects.toThrow('checksum mismatch');
    });

    it('extracts tar.gz archives and keeps their supporting files', async () => {
        const source = path.join(home, 'source');
        await mkdir(source);
        await writeFile(path.join(source, 'agent'), 'executable');
        await writeFile(path.join(source, 'config'), 'support');
        const archive = path.join(home, 'agent.tar.gz');
        await tar.c({ cwd: source, gzip: true, file: archive }, ['agent', 'config']);
        vi.mocked(fetch).mockResolvedValue(new Response(await readFile(archive)));
        const installed = await installAcpBinary({
            [target]: { archive: 'https://example.com/agent.tar.gz', cmd: './agent' },
        });
        expect(await readFile(installed.command, 'utf8')).toBe('executable');
        expect(await readFile(path.join(path.dirname(installed.command), 'config'), 'utf8')).toBe('support');
    });

    it.each([
        [
            'zip',
            'UEsDBBQAAAAAAKG4YV0F6eDGBgAAAAYAAAAFAAAAYWdlbnRiaW5hcnlQSwECFAMUAAAAAAChuGFdBengxgYAAAAGAAAABQAAAAAAAAAAAAAAgAEAAAAAYWdlbnRQSwUGAAAAAAEAAQAzAAAAKQAAAAAA',
        ],
        [
            'tar.bz2',
            'QlpoOTFBWSZTWSQLNAMAAGz7gMmAAARAAFWAAAhyoR4gCAggAFRCDQhjQTaNBJFGjRiANMl6xHQgtihCNaziUlpmgQwMUcTsI3dDSiyhkT2gZoqf63twLFVSgiIB0XckU4UJAkCzQDA=',
        ],
    ])('extracts %s distributions', async (extension, fixture) => {
        vi.mocked(fetch).mockResolvedValue(new Response(Buffer.from(fixture, 'base64')));
        const installed = await installAcpBinary({
            [target]: { archive: `https://example.com/agent.${extension}`, cmd: './agent' },
        });
        expect(await readFile(installed.command, 'utf8')).toBe('binary');
    });
});
