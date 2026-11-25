export enum SelectionType {
    All = 'all',
}

export interface LLMMessage {
    role: string;
    content: string;
}

export interface LLMEngineMessage {
    originalMessage: LLMMessage;
    inScope: boolean;
}

export interface GuardMessageResult {
    passed: boolean;
    reason?: string;
}

export interface GuardResult extends GuardMessageResult {
    guardId: string;
    guardName: string;
    modifiedMessage?: LLMMessage;
}

export type Guard = (messages: LLMEngineMessage[]) => Promise<GuardResult[]>;

export interface GuardrailsEngineOptions {
    guards?: Guard[];
    enabled?: boolean;
}

export interface GuardrailsEngineResult {
    messages: LLMMessage[];
    messagesWithGuardResult: Array<{
        guardId: string;
        guardName: string;
        messages: GuardMessageResult[];
    }>;
}

export interface GuardBaseOptions {
    roles?: string[];
    failOnError?: boolean;
}

export interface InjectionGuardOptions extends GuardBaseOptions {
    mode?: 'heuristic' | 'pattern';
    threshold?: number;
}

export interface LeakageGuardOptions extends GuardBaseOptions {
    mode?: 'heuristic' | 'pattern';
    threshold?: number;
}

export interface PiiGuardOptions extends GuardBaseOptions {
    selection?: SelectionType;
    mode?: 'redact' | 'block';
}

export interface SecretGuardOptions extends GuardBaseOptions {
    selection?: SelectionType;
    mode?: 'block' | 'redact';
}
