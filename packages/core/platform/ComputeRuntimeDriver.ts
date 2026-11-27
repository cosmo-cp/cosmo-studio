export interface ProcessSession {
    sessionId: string;
    stdin: NodeJS.WritableStream;
    stdout: NodeJS.ReadableStream;
    stderr: NodeJS.ReadableStream;
    terminate(): Promise<void>;
}

export interface InteractiveSessionContext {
    conversationId: string;
    agentName: string;
    command: string;
    args?: string[];
    cwd?: string;
    env: Record<string, string>;
}

export interface TaskExecutionContext {
    taskId: string;
    organizationId: string;
    userId: string;
    workspaceType: 'GIT' | 'UPLOADED';
    command?: string;
    args?: string[];
    cwd?: string;
    env?: Record<string, string>;
    gitConfig?: { repoUrl: string; branch: string; tokenSecretRef: string };
    snapshotConfig?: { downloadUrl: string; uploadUrl: string };
    timeoutSeconds: number;
}

export type WorkerExecutionStatus = 'PROVISIONING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

/**
 * Service Provider Interface for agent and task compute execution.
 * Cosmo Studio defaults to local host subprocesses; Cosmo Cloud rebinds this to mTLS gRPC sandboxes.
 */
export interface ComputeRuntimeDriver {
    startInteractiveSession(context: InteractiveSessionContext): Promise<ProcessSession>;
    executeTaskWorker(context: TaskExecutionContext): Promise<{ workerId: string; exitCode: Promise<number> }>;
    getWorkerStatus(workerId: string): Promise<WorkerExecutionStatus>;
    terminateWorker(workerId: string): Promise<void>;
}
