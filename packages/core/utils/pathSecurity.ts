import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { PathValidationResult } from '../dto';

/**
 * Checks whether a canonical filesystem path represents a prohibited system root,
 * credential directory, or user home root.
 *
 * Enforces:
 * 1. System root directories (e.g., /, /etc, /System, C:\, C:\Windows, /var, /usr)
 * 2. Sensitive credential directories (e.g., ~/.ssh, ~/.aws, ~/.gnupg)
 * 3. Exact user home directory (registration of root home folder itself is forbidden)
 */
export function isProtectedRoot(canonicalPath: string): boolean {
    if (!canonicalPath) {
        return true;
    }

    const normalized = path.resolve(canonicalPath);
    const root = path.parse(normalized).root;

    // Direct filesystem root (e.g. '/' on Unix or 'C:\' on Windows)
    if (normalized === root) {
        return true;
    }

    const home = path.resolve(os.homedir());
    // Direct home directory cannot be registered as a workspace
    if (normalized === home) {
        return true;
    }

    // Allow directories within OS temp directory (e.g. testing or scratch workspaces)
    const tmp = path.resolve(os.tmpdir());
    if (normalized === tmp || normalized.startsWith(tmp + path.sep)) {
        return false;
    }
    try {
        const realTmp = fs.realpathSync(tmp);
        if (normalized === realTmp || normalized.startsWith(realTmp + path.sep)) {
            return false;
        }
    } catch {
        // ignore if realpath fails
    }

    // Sensitive credential / config directories
    const protectedHomeSubdirs = [path.join(home, '.ssh'), path.join(home, '.aws'), path.join(home, '.gnupg')];

    for (const credDir of protectedHomeSubdirs) {
        let resolvedCredDir = path.resolve(credDir);
        try {
            if (fs.existsSync(resolvedCredDir)) {
                resolvedCredDir = fs.realpathSync(resolvedCredDir);
            }
        } catch {
            // ignore
        }
        if (normalized === resolvedCredDir || normalized.startsWith(resolvedCredDir + path.sep)) {
            return true;
        }
    }

    // System roots & OS protected directories
    const systemDirs = [
        '/etc',
        '/System',
        '/Library',
        '/Windows',
        '/Program Files',
        '/Program Files (x86)',
        '/var',
        '/usr',
        '/bin',
        '/sbin',
        '/boot',
        '/dev',
        '/lib',
        '/lib64',
        '/sys',
        '/proc',
    ];

    const isWindows = process.platform === 'win32';

    let realNormalized = normalized;
    try {
        if (fs.existsSync(normalized)) {
            realNormalized = fs.realpathSync(normalized);
        }
    } catch {
        // ignore
    }

    for (const sysDir of systemDirs) {
        let candidate = sysDir;
        let uncanonicalCandidate = sysDir;
        if (isWindows) {
            candidate = path.resolve(root, sysDir.replace(/^\/+/, ''));
            uncanonicalCandidate = candidate;
        } else {
            uncanonicalCandidate = path.resolve(sysDir);
            candidate = uncanonicalCandidate;
            try {
                if (fs.existsSync(candidate)) {
                    candidate = fs.realpathSync(candidate);
                }
            } catch {
                // ignore
            }
        }

        const normalizedCmp = isWindows ? normalized.toLowerCase() : normalized;
        const realNormalizedCmp = isWindows ? realNormalized.toLowerCase() : realNormalized;
        const candidateCmp = isWindows ? candidate.toLowerCase() : candidate;
        const uncanonicalCmp = isWindows ? uncanonicalCandidate.toLowerCase() : uncanonicalCandidate;

        if (
            normalizedCmp === candidateCmp ||
            normalizedCmp.startsWith(candidateCmp + path.sep) ||
            normalizedCmp === uncanonicalCmp ||
            normalizedCmp.startsWith(uncanonicalCmp + path.sep) ||
            realNormalizedCmp === candidateCmp ||
            realNormalizedCmp.startsWith(candidateCmp + path.sep) ||
            realNormalizedCmp === uncanonicalCmp ||
            realNormalizedCmp.startsWith(uncanonicalCmp + path.sep)
        ) {
            return true;
        }
    }

    return false;
}

/**
 * Validates that an input path exists, is an accessible directory, and resolves to
 * a safe canonical path not violating system protection rules.
 */
export async function validateAndCanonicalizePath(inputPath: string): Promise<PathValidationResult> {
    if (!inputPath || typeof inputPath !== 'string' || !inputPath.trim()) {
        return { isValid: false, error: 'Path must not be empty' };
    }

    const trimmed = inputPath.trim();
    const expanded = trimmed.replace(/^~(?=$|\/|\\)/, os.homedir());

    if (!path.isAbsolute(expanded)) {
        return { isValid: false, error: 'Path must be an absolute filesystem path' };
    }

    const resolvedPath = path.resolve(expanded);

    try {
        const stat = await fs.promises.stat(resolvedPath);
        if (!stat.isDirectory()) {
            return { isValid: false, error: `Path is not a directory: ${resolvedPath}` };
        }
    } catch {
        return { isValid: false, error: `Directory does not exist: ${resolvedPath}` };
    }

    let canonicalPath: string;
    try {
        canonicalPath = await fs.promises.realpath(resolvedPath);
    } catch {
        canonicalPath = resolvedPath;
    }

    if (isProtectedRoot(canonicalPath)) {
        return {
            isValid: false,
            error: `Targeting protected system root or credential directory is prohibited: ${canonicalPath}`,
        };
    }

    return { isValid: true, canonicalPath: canonicalPath };
}
