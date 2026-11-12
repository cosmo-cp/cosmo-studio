import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { access, mkdir, mkdtemp, rename, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import AdmZip from 'adm-zip';
import * as tar from 'tar';

// Checksums published with the Node.js v24.21.0 release.
const VERSION = 'v24.21.0';
const CHECKSUMS: Record<string, string> = {
    'darwin-arm64': 'bed7eea5325e1108f32ce5228ddd6a5f0f08a499ee42aa7442aea583702f6057',
    'darwin-x64': '1462cb3b3046b815cf8ea436d3da450ec1a9f11dac7e5a46b0ada5305d7e8097',
    'linux-arm64': '724282c3b43aec998aa9527380465b45d229e021b58035f5f4f63095eabfe5d5',
    'linux-x64': '6e1db87ef58b8819e5d5402eff1536491b18edd8eb7bee5ef7897876e88dc5ff',
    'win32-arm64': '8779b1bde1d39f8d420e3b57aa657b39891af434d3de44a919044cec06785921',
    'win32-x64': '158f7685b44de51f6c0df1d153526cbcd3e1bc739a8dfc607721cef75de9e541',
};
const run = promisify(execFile);
let pending: Promise<NodeRuntime> | undefined;

export interface NodeRuntime {
    node: string;
    npx: string;
    bin: string;
}

// Construct executable paths without depending on shell wrappers or system PATH.
function paths(root: string): NodeRuntime {
    const windows = process.platform === 'win32';
    return {
        node: path.join(root, windows ? 'node.exe' : 'bin/node'),
        npx: path.join(root, windows ? 'node_modules/npm/bin/npx-cli.js' : 'bin/npx'),
        bin: path.join(root, windows ? '.' : 'bin'),
    };
}

// Check the actual runtime and npm CLI rather than treating a partial extraction as installed.
async function usable(runtime: NodeRuntime): Promise<boolean> {
    try {
        await access(runtime.npx);
        const result = await run(runtime.node, ['--version'], { timeout: 10000, windowsHide: true });
        if (result.stdout.trim() !== VERSION) return false;
        await run(runtime.node, [runtime.npx, '--version'], { timeout: 10000, windowsHide: true });
        return true;
    } catch {
        return false;
    }
}

// Build an environment that allows npm and agent subprocesses to find the private Node executable.
export function nodeRuntimeEnv(runtime: NodeRuntime, env: Record<string, string> = {}): Record<string, string> {
    const currentPath = env.PATH ?? env.Path ?? process.env.PATH ?? process.env.Path ?? '';
    const result: Record<string, string> = { ...env, PATH: `${runtime.bin}${path.delimiter}${currentPath}` };
    if (process.platform === 'win32') delete result.Path;
    return result;
}

// Share a single installation among simultaneous agent requests in this process.
export async function ensureAcpNodeRuntime(): Promise<NodeRuntime> {
    if (!pending) {
        pending = install().finally(() => {
            pending = undefined;
        });
    }
    return pending;
}

// Verify a pinned official distribution before atomically publishing the extracted runtime.
async function install(): Promise<NodeRuntime> {
    const target = `${process.platform}-${process.arch}`;
    const checksum = CHECKSUMS[target];
    if (!checksum) throw new Error(`Node.js runtime is not available for ${target}.`);
    const root = path.join(homedir(), '.cosmo-studio', 'runtime', 'node');
    const destination = path.join(root, `${VERSION}-${target}`);
    const runtime = paths(destination);
    if (await usable(runtime)) return runtime;
    await mkdir(root, { recursive: true });
    const temporary = await mkdtemp(path.join(root, '.install-'));
    try {
        const windows = process.platform === 'win32';
        const archiveName = `node-${VERSION}-${windows ? 'win' : process.platform}-${process.arch}.${windows ? 'zip' : 'tar.gz'}`;
        const response = await fetch(`https://nodejs.org/dist/${VERSION}/${archiveName}`);
        if (!response.ok) throw new Error(`Node.js download failed (${response.status}).`);
        const bytes = Buffer.from(await response.arrayBuffer());
        if (createHash('sha256').update(bytes).digest('hex') !== checksum)
            throw new Error('Node.js download checksum mismatch.');
        const archive = path.join(temporary, archiveName);
        await writeFile(archive, bytes);
        if (windows) new AdmZip(archive).extractAllTo(temporary, true);
        else await tar.x({ file: archive, cwd: temporary, strict: true });
        const extracted = path.join(temporary, archiveName.replace(/\.(zip|tar\.gz)$/, ''));
        if (!(await usable(paths(extracted))))
            throw new Error('Downloaded Node.js runtime is incomplete or cannot run.');
        // Another process may have completed the same install while this one downloaded.
        if (!(await usable(runtime))) {
            await rm(destination, { recursive: true, force: true });
            try {
                await rename(extracted, destination);
            } catch (error) {
                if (!(await usable(runtime))) throw error;
            }
        }
        return runtime;
    } finally {
        await rm(temporary, { recursive: true, force: true });
    }
}
