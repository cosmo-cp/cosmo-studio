import { EventEmitter } from 'events';
import { PassThrough } from 'stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HostProcessComputeDriver } from '../HostProcessComputeDriver';

const spawnMock = vi.hoisted(() => {
    return vi.fn();
});

vi.mock('child_process', () => {
    return {
        spawn: spawnMock,
    };
});

function createMockChildProcess() {
    const child = new EventEmitter() as EventEmitter & {
        stdin: PassThrough;
        stdout: PassThrough;
        stderr: PassThrough;
        killed: boolean;
        exitCode: number | null;
        kill: ReturnType<typeof vi.fn>;
    };
    child.stdin = new PassThrough();
    child.stdout = new PassThrough();
    child.stderr = new PassThrough();
    child.killed = false;
    child.exitCode = null;
    child.kill = vi.fn(() => {
        child.killed = true;
        return true;
    });
    return child;
}

describe('HostProcessComputeDriver', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useRealTimers();
    });

    it('starts interactive sessions, tracks exit status, and terminates cleanly', async () => {
        const child = createMockChildProcess();
        spawnMock.mockReturnValueOnce(child);

        const driver = new HostProcessComputeDriver();
        const session = await driver.startInteractiveSession({
            conversationId: 'conv-1',
            agentName: 'claude',
            command: 'npx',
            args: ['-y', 'agent'],
            cwd: '/workspace',
            env: { CUSTOM: '1' },
        });

        expect(session.sessionId).toContain('local-session-conv-1-');
        await expect(driver.getWorkerStatus(session.sessionId)).resolves.toBe('RUNNING');

        child.emit('exit', 0);
        await expect(driver.getWorkerStatus(session.sessionId)).resolves.toBe('COMPLETED');

        await session.terminate();
        await expect(driver.getWorkerStatus(session.sessionId)).rejects.toThrow('Unknown worker');
    });

    it('marks interactive session FAILED on non-zero exit and kills active child on terminate', async () => {
        const child = createMockChildProcess();
        spawnMock.mockReturnValueOnce(child);

        const driver = new HostProcessComputeDriver();
        const session = await driver.startInteractiveSession({
            conversationId: 'conv-2',
            agentName: 'agent',
            command: 'node',
            env: {},
        });

        child.emit('exit', 1);
        await expect(driver.getWorkerStatus(session.sessionId)).resolves.toBe('FAILED');

        const activeChild = createMockChildProcess();
        spawnMock.mockReturnValueOnce(activeChild);
        const activeSession = await driver.startInteractiveSession({
            conversationId: 'conv-3',
            agentName: 'agent',
            command: 'node',
            env: {},
        });

        await driver.terminateWorker(activeSession.sessionId);
        expect(activeChild.kill).toHaveBeenCalledWith('SIGTERM');
    });

    it('executes batch task workers, enforces timeouts, and handles process errors', async () => {
        vi.useFakeTimers();
        const child = createMockChildProcess();
        spawnMock.mockReturnValueOnce(child);

        const driver = new HostProcessComputeDriver();
        const { workerId, exitCode } = await driver.executeTaskWorker({
            taskId: 'task-1',
            organizationId: 'org-1',
            userId: 'user-1',
            workspaceType: 'GIT',
            timeoutSeconds: 10,
        });

        vi.advanceTimersByTime(10000);
        expect(child.kill).toHaveBeenCalledWith('SIGTERM');

        child.emit('exit', 0);
        await expect(exitCode).resolves.toBe(0);
        await expect(driver.getWorkerStatus(workerId)).resolves.toBe('COMPLETED');

        const failingChild = createMockChildProcess();
        spawnMock.mockReturnValueOnce(failingChild);
        const failedRun = await driver.executeTaskWorker({
            taskId: 'task-2',
            organizationId: 'org-1',
            userId: 'user-1',
            workspaceType: 'UPLOADED',
            timeoutSeconds: 10,
        });
        failingChild.emit('error', new Error('spawn failed'));
        await expect(failedRun.exitCode).rejects.toThrow('spawn failed');
        await expect(driver.getWorkerStatus(failedRun.workerId)).resolves.toBe('FAILED');

        await expect(driver.terminateWorker('missing-worker')).resolves.toBeUndefined();
    });

    it('resolves non-null exit defaults cleanly and cleans timeout on terminate', async () => {
        const child = createMockChildProcess();
        spawnMock.mockReturnValueOnce(child);

        const driver = new HostProcessComputeDriver();
        const run = await driver.executeTaskWorker({
            taskId: 'task-3',
            organizationId: 'org-1',
            userId: 'user-1',
            workspaceType: 'GIT',
            command: 'custom-bin',
            args: ['--flag'],
            timeoutSeconds: 30,
        });

        await driver.terminateWorker(run.workerId);
        expect(child.kill).toHaveBeenCalledWith('SIGTERM');

        child.emit('exit', null);
        await expect(run.exitCode).resolves.toBe(1);
    });
});
