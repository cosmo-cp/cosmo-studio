import { afterEach, describe, expect, it, vi } from 'vitest';
import { AcpAgentRuntimeService } from './AcpAgentRuntimeService';

vi.mock('core/services/AcpNodeRuntime', () => {
    return {
        ensureAcpNodeRuntime: vi
            .fn()
            .mockResolvedValue({ node: '/runtime/node', npx: '/runtime/npx-cli.js', bin: '/runtime' }),
        nodeRuntimeEnv: vi.fn().mockReturnValue({ PATH: '/runtime' }),
    };
});

describe('ACP process leases', () => {
    afterEach(() => {
        return vi.useRealTimers();
    });

    it('runs concurrent requests separately and reuses only idle processes until their timeout', async () => {
        vi.useFakeTimers();
        const config = {
            enabled: true,
            name: 'agent',
            command: 'agent',
            args: [],
            env: {},
            defaultCwd: '/tmp',
            mcpServerIds: [],
        };
        const agents = { getRuntimeConfig: vi.fn().mockResolvedValue(config) };
        const service = new AcpAgentRuntimeService(agents as never, {} as never);
        const providers: { initSession: ReturnType<typeof vi.fn>; cleanup: ReturnType<typeof vi.fn> }[] = [];
        vi.spyOn(service as never, 'createProcessProvider').mockImplementation(() => {
            const provider = {
                initSession: vi.fn().mockResolvedValue({}),
                cleanup: vi.fn(),
                languageModel: vi.fn(),
                authenticate: vi.fn(),
            };
            providers.push(provider);
            return provider as never;
        });
        const first = await service.createProvider('a', null, 'chat');
        const second = await service.createProvider('a', null, 'chat');
        expect(providers).toHaveLength(2);
        first.cleanup();
        first.cleanup();
        vi.advanceTimersByTime(299999);
        const reused = await service.createProvider('a', null, 'chat');
        vi.advanceTimersByTime(1);
        expect(providers[0].cleanup).not.toHaveBeenCalled();
        reused.cleanup();
        second.cleanup();
        vi.advanceTimersByTime(300000);
        expect(providers[0].cleanup).toHaveBeenCalledTimes(1);
        expect(providers[1].cleanup).toHaveBeenCalledTimes(1);
    });
    it('stops idle and active providers without affecting another agent', async () => {
        vi.useFakeTimers();
        const config = { enabled: true, name: 'agent', command: 'agent', args: [], env: {}, defaultCwd: '/tmp' };
        const service = new AcpAgentRuntimeService(
            { getRuntimeConfig: vi.fn().mockResolvedValue(config) } as never,
            {} as never,
        );
        const providers: { cleanup: ReturnType<typeof vi.fn> }[] = [];
        vi.spyOn(service as never, 'createProcessProvider').mockImplementation(() => {
            const provider = { initSession: vi.fn().mockResolvedValue({}), cleanup: vi.fn() };
            providers.push(provider);
            return provider as never;
        });
        const idle = await service.createProvider('a');
        const active = await service.createProvider('a');
        const other = await service.createProvider('b');
        idle.cleanup();
        service.stopAgent('a');
        active.cleanup();
        vi.advanceTimersByTime(300000);
        expect(providers[0].cleanup).toHaveBeenCalledOnce();
        expect(providers[1].cleanup).toHaveBeenCalledOnce();
        expect(providers[2].cleanup).not.toHaveBeenCalled();
        other.cleanup();
    });
    it('cleans up a failed initialization and reports the test failure', async () => {
        const agents = {
            getRuntimeConfig: vi
                .fn()
                .mockResolvedValue({ enabled: true, name: 'agent', command: 'agent', defaultCwd: '/tmp' }),
        };
        const service = new AcpAgentRuntimeService(agents as never, {} as never);
        const cleanup = vi.fn();
        vi.spyOn(service as never, 'createProcessProvider').mockReturnValue({
            initSession: vi.fn().mockRejectedValue(new Error('startup failed')),
            cleanup: cleanup,
        } as never);
        expect(await service.testAgent('a')).toEqual({ ok: false, message: 'startup failed' });
        expect(cleanup).toHaveBeenCalledOnce();
    });
    it('uses the shared Node runtime for saved registry npx agents', async () => {
        const agents = {
            getRuntimeConfig: vi.fn().mockResolvedValue({
                enabled: true,
                source: 'registry',
                name: 'agent',
                command: 'npx',
                args: ['-y', 'example'],
                env: {},
                defaultCwd: '/tmp',
            }),
        };
        const service = new AcpAgentRuntimeService(agents as never, {} as never);
        const create = vi
            .spyOn(service as never, 'createProcessProvider')
            .mockReturnValue({ initSession: vi.fn().mockResolvedValue({}), cleanup: vi.fn() } as never);
        await service.createProvider('a');
        expect(create).toHaveBeenCalledWith(
            expect.objectContaining({
                command: '/runtime/node',
                args: ['/runtime/npx-cli.js', '-y', 'example'],
                env: { PATH: '/runtime' },
            }),
        );
    });
    it('uses the shared Node runtime when testing a manually configured npx agent', async () => {
        const agents = {
            getRuntimeConfig: vi.fn().mockResolvedValue({
                enabled: true,
                source: 'custom',
                name: 'agent',
                command: 'npx',
                args: ['-y', 'example'],
                env: {},
                defaultCwd: '/tmp',
            }),
        };
        const service = new AcpAgentRuntimeService(agents as never, {} as never);
        const create = vi.spyOn(service as never, 'createProcessProvider').mockReturnValue({
            initSession: vi.fn().mockResolvedValue({}),
            cleanup: vi.fn(),
        } as never);
        expect(await service.testAgent('a')).toMatchObject({ ok: true });
        expect(create).toHaveBeenCalledWith(
            expect.objectContaining({
                command: '/runtime/node',
                args: ['/runtime/npx-cli.js', '-y', 'example'],
                env: { PATH: '/runtime' },
            }),
        );
    });
});
