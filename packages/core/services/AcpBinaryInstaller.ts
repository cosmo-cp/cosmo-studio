import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { chmod, lstat, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import extractZip from 'extract-zip';
import * as tar from 'tar';
import { z } from 'zod';

const binarySchema = z.object({
    archive: z.url().refine((value) => {
        return new URL(value).protocol === 'https:';
    }),
    cmd: z.string().min(1),
    sha256: z
        .string()
        .regex(/^[a-fA-F0-9]{64}$/)
        .optional(),
    args: z.array(z.string()).optional().default([]),
    env: z.record(z.string(), z.string()).optional().default({}),
});

// Reject archive paths that could escape the isolated installation directory.
function safePath(name: string): boolean {
    const normalized = name.replace(/\\/g, '/');
    return !normalized.startsWith('/') && !/^[a-z]:/i.test(normalized) && !normalized.split('/').includes('..');
}

// Remove only a directory created by the binary installer, never an arbitrary command path.
export async function uninstallAcpBinary(command: string): Promise<void> {
    const root = path.join(homedir(), '.cosmo-studio', 'acp-agents');
    const relative = path.relative(root, command);
    const parts = relative.split(path.sep);
    if (
        path.isAbsolute(relative) ||
        parts.length < 3 ||
        !/^agent-[a-zA-Z0-9]+$/.test(parts[0]) ||
        parts[1] !== 'contents' ||
        parts.includes('..')
    )
        return;
    const directory = path.join(root, parts[0]);
    try {
        if (!(await lstat(directory)).isDirectory()) return;
        await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
}

// Download and unpack one platform distribution without starting the agent.
export async function installAcpBinary(distributions: Record<string, unknown>) {
    const platform = process.platform === 'win32' ? 'windows' : process.platform;
    const arch = process.arch === 'arm64' ? 'aarch64' : process.arch === 'x64' ? 'x86_64' : process.arch;
    const target = `${platform}-${arch}`;
    const parsed = binarySchema.safeParse(distributions[target]);
    if (!parsed.success) {
        throw new Error(`No valid ACP binary distribution for ${target}.`);
    }
    const binary = parsed.data;
    if (!safePath(binary.cmd) || binary.cmd === '.') {
        throw new Error('Invalid ACP binary command path.');
    }
    const root = path.join(homedir(), '.cosmo-studio', 'acp-agents');
    await mkdir(root, { recursive: true });
    const directory = await mkdtemp(path.join(root, 'agent-'));
    try {
        const response = await fetch(binary.archive);
        if (!response.ok) {
            throw new Error(`Failed to download ACP binary: ${response.status}`);
        }
        const bytes = Buffer.from(await response.arrayBuffer());
        if (binary.sha256 && createHash('sha256').update(bytes).digest('hex') !== binary.sha256.toLowerCase()) {
            throw new Error('ACP binary checksum mismatch.');
        }
        const name = new URL(binary.archive).pathname.toLowerCase();
        if (/\.(dmg|pkg|deb|rpm|msi|appimage)$/.test(name)) {
            throw new Error('Unsupported ACP binary installer format.');
        }
        const archive = path.join(directory, '.download');
        const contents = path.join(directory, 'contents');
        await mkdir(contents);
        await writeFile(archive, bytes);
        if (name.endsWith('.zip')) {
            await extractZip(archive, {
                dir: contents,
                onEntry: (entry) => {
                    if (!safePath(entry.fileName) || ((entry.externalFileAttributes >>> 16) & 0o170000) === 0o120000) {
                        throw new Error('Unsafe ACP archive entry.');
                    }
                },
            });
        } else if (/\.(tar\.gz|tgz|tar\.bz2|tbz2)$/.test(name)) {
            const extractor = tar.x({
                cwd: contents,
                strict: true,
                filter: (entryPath, entry) => {
                    if (
                        !safePath(entryPath) ||
                        !('type' in entry) ||
                        !['File', 'Directory', 'OldFile'].includes(entry.type)
                    ) {
                        throw new Error('Unsafe ACP archive entry.');
                    }
                    return true;
                },
            });
            if (/\.(tar\.bz2|tbz2)$/.test(name)) {
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                const decompress = require('unbzip2-stream') as () => NodeJS.ReadWriteStream;
                await pipeline(createReadStream(archive), decompress(), extractor);
            } else {
                await pipeline(createReadStream(archive), extractor);
            }
        } else {
            const destination = path.resolve(contents, binary.cmd);
            await mkdir(path.dirname(destination), { recursive: true });
            await writeFile(destination, await readFile(archive));
        }
        const command = path.resolve(contents, binary.cmd);
        if (!(await stat(command)).isFile()) {
            throw new Error('ACP binary command is not a file.');
        }
        await chmod(command, 0o755);
        await rm(archive);
        return { command: command, args: binary.args, env: binary.env, directory: directory };
    } catch (error) {
        await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
        throw error;
    }
}
