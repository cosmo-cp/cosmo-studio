import type {
    AcpAgentCreateInput,
    AcpAgentTestResult,
    AcpAgentUpdateInput,
    AcpAgentView,
    AcpRegistryInstallInput,
    AcpRegistryView,
} from '../../../packages/core/dto';

export interface AcpAgentApi {
    getAll(): Promise<AcpAgentView[]>;
    create(input: AcpAgentCreateInput): Promise<AcpAgentView>;
    update(id: string, input: AcpAgentUpdateInput): Promise<AcpAgentView>;
    delete(id: string): Promise<void>;
    enable(id: string): Promise<AcpAgentView>;
    disable(id: string): Promise<AcpAgentView>;
    getRegistry(): Promise<AcpRegistryView>;
    refreshRegistry(): Promise<AcpRegistryView>;
    installFromRegistry(input: AcpRegistryInstallInput): Promise<AcpAgentView>;
    test(id: string, cwd: string | null): Promise<AcpAgentTestResult>;
}
