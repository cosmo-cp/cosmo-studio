import { injectable } from 'inversify';

export interface TokenUsageTelemetryEvent {
    organizationId?: string | null;
    userId?: string | null;
    workspaceId?: string | null;
    sourceType: 'chat' | 'task' | 'acp_agent' | 'code_execution' | 'workflow';
    sourceId: string;
    modelId: string;
    providerId: string;
    promptTokens: number;
    completionTokens: number;
    cachedTokens?: number;
    reasoningTokens?: number;
    totalTokens: number;
    latencyMs: number;
}

export interface ToolExecutionTelemetryEvent {
    organizationId?: string | null;
    userId?: string | null;
    workspaceId?: string | null;
    sandboxId?: string;
    toolName: string;
    executionTimeMs: number;
    status: 'success' | 'error' | 'timeout';
}

/**
 * Service Provider Interface for usage and operational telemetry emission.
 */
export interface TelemetryEmitter {
    emitTokenUsage(event: TokenUsageTelemetryEvent): void;
    emitToolExecution(event: ToolExecutionTelemetryEvent): void;
    flush(): Promise<void>;
}

/**
 * Zero-overhead no-op implementation for Cosmo Studio local workstation mode.
 */
@injectable()
export class NoOpTelemetryEmitter implements TelemetryEmitter {
    public emitTokenUsage(_event: TokenUsageTelemetryEvent): void {
        void _event;
    }

    public emitToolExecution(_event: ToolExecutionTelemetryEvent): void {
        void _event;
    }

    public async flush(): Promise<void> {
        return;
    }
}
