import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ensureAcpNodeRuntime, nodeRuntimeEnv } from './AcpNodeRuntime';

const state = vi.hoisted(() => {
    return { home: '' };
});
vi.mock('node:os', async (original) => {
    const actual = await original<typeof import('node:os')>();
    return {
        ...actual,
        homedir: () => {
            return state.home;
        },
    };
});

describe.skipIf(process.platform === 'win32')('shared ACP Node runtime', () => {
    beforeEach(async () => {
        state.home = await mkdtemp(path.join(tmpdir(), 'acp-runtime-test-'));
    });
    afterEach(async () => {
        vi.unstubAllGlobals();
        await rm(state.home, { recursive: true, force: true });
    });

    it('reuses a valid runtime and prepends its directory to agent PATH', async () => {
        const root = path.join(
            state.home,
            '.cosmo-studio/runtime/node',
            `v24.21.0-${process.platform}-${process.arch}`,
        );
        await mkdir(path.join(root, 'bin'), { recursive: true });
        await writeFile(path.join(root, 'bin/node'), '#!/bin/sh\necho v24.21.0\n');
        await chmod(path.join(root, 'bin/node'), 0o755);
        await writeFile(path.join(root, 'bin/npx'), '');
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
        const runtime = await ensureAcpNodeRuntime();
        expect(runtime.node).toBe(path.join(root, 'bin/node'));
        expect(nodeRuntimeEnv(runtime, { PATH: '/other' }).PATH).toBe(`${runtime.bin}${path.delimiter}/other`);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('rejects a corrupt download and shares concurrent installation attempts', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            arrayBuffer: async () => {
                return Buffer.from('corrupt');
            },
        });
        vi.stubGlobal('fetch', fetchMock);
        const results = await Promise.allSettled([ensureAcpNodeRuntime(), ensureAcpNodeRuntime()]);
        expect(
            results.every((result) => {
                return result.status === 'rejected' && String(result.reason).includes('checksum mismatch');
            }),
        ).toBe(true);
        expect(fetchMock).toHaveBeenCalledOnce();
        await expect(ensureAcpNodeRuntime()).rejects.toThrow('checksum mismatch');
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });
});
