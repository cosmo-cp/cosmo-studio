import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import crypto from 'crypto';
import { injectable } from 'inversify';
import type {
    ComputeRuntimeDriver,
    InteractiveSessionContext,
    ProcessSession,
    TaskExecutionContext,
    WorkerExecutionStatus,
} from './ComputeRuntimeDriver';

interface ActiveWorkerRecord {
    process: ChildProcessWithoutNullStreams;
    status: WorkerExecutionStatus;
    timeoutHandle?: ReturnType<typeof setTimeout>;
}

/**
 * Local workstation ComputeRuntimeDriver spawning bounded host child processes.
 */
@injectable()
export class HostProcessComputeDriver implements ComputeRuntimeDriver {
    private readonly activeWorkers = new Map<string, ActiveWorkerRecord>();

    public async startInteractiveSession(context: InteractiveSessionContext): Promise<ProcessSession> {
        const sessionId = `local-session-${context.conversationId}-${crypto.randomUUID()}`;
        const child = spawn(context.command, context.args ?? [], {
            cwd: context.cwd,
            env: {
                ...process.env,
                ...context.env,
            },
            stdio: ['pipe', 'pipe', 'pipe'],
        });

        this.activeWorkers.set(sessionId, {
            process: child,
            status: 'RUNNING',
        });

        child.once('exit', (code) => {
            const record = this.activeWorkers.get(sessionId);
            if (record) {
                record.status = code === 0 ? 'COMPLETED' : 'FAILED';
            }
        });

        return {
            sessionId: sessionId,
            stdin: child.stdin,
            stdout: child.stdout,
            stderr: child.stderr,
            terminate: async () => {
                await this.terminateWorker(sessionId);
            },
        };
    }

    public async executeTaskWorker(
        context: TaskExecutionContext,
    ): Promise<{ workerId: string; exitCode: Promise<number> }> {
        const workerId = `local-worker-${context.taskId}-${crypto.randomUUID()}`;
        const command = context.command ?? process.execPath;
        const child = spawn(command, context.args ?? [], {
            cwd: context.cwd,
            env: {
                ...process.env,
                ...context.env,
            },
            stdio: ['pipe', 'pipe', 'pipe'],
        });

        const record: ActiveWorkerRecord = {
            process: child,
            status: 'RUNNING',
        };

        if (context.timeoutSeconds > 0) {
            record.timeoutHandle = setTimeout(() => {
                child.kill('SIGTERM');
            }, context.timeoutSeconds * 1000);
        }

        this.activeWorkers.set(workerId, record);

        const exitCode = new Promise<number>((resolve, reject) => {
            child.once('error', (error) => {
                if (record.timeoutHandle) {
                    clearTimeout(record.timeoutHandle);
                }
                record.status = 'FAILED';
                reject(error);
            });

            child.once('exit', (code) => {
                if (record.timeoutHandle) {
                    clearTimeout(record.timeoutHandle);
                }
                const normalizedCode = code ?? 1;
                record.status = normalizedCode === 0 ? 'COMPLETED' : 'FAILED';
                resolve(normalizedCode);
            });
        });

        return {
            workerId: workerId,
            exitCode: exitCode,
        };
    }

    public async getWorkerStatus(workerId: string): Promise<WorkerExecutionStatus> {
        const record = this.activeWorkers.get(workerId);
        if (!record) {
            throw new Error(`Unknown worker '${workerId}'.`);
        }

        return record.status;
    }

    public async terminateWorker(workerId: string): Promise<void> {
        const record = this.activeWorkers.get(workerId);
        if (!record) {
            return;
        }

        if (record.timeoutHandle) {
            clearTimeout(record.timeoutHandle);
        }

        if (!record.process.killed && record.process.exitCode === null) {
            record.process.kill('SIGTERM');
        }

        record.status = 'COMPLETED';
        this.activeWorkers.delete(workerId);
    }
}
