import { ipcRenderer } from 'electron';
import type {
    AcpAgentCreateInput,
    AcpAgentTestResult,
    AcpAgentUpdateInput,
    AcpAgentView,
    AcpRegistryInstallInput,
    AcpRegistryView,
} from '../../../packages/core/dto';
import { callRpc } from './common';

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

export const acpAgentRpcApi: AcpAgentApi = {
    getAll: () => ipcRenderer.invoke('acpAgent:getAll'),
    create: (input: AcpAgentCreateInput) => ipcRenderer.invoke('acpAgent:create', input),
    update: (id: string, input: AcpAgentUpdateInput) => ipcRenderer.invoke('acpAgent:update', id, input),
    delete: (id: string) => ipcRenderer.invoke('acpAgent:delete', id),
    enable: (id: string) => ipcRenderer.invoke('acpAgent:enable', id),
    disable: (id: string) => ipcRenderer.invoke('acpAgent:disable', id),
    getRegistry: () => ipcRenderer.invoke('acpAgent:getRegistry'),
    refreshRegistry: () => ipcRenderer.invoke('acpAgent:refreshRegistry'),
    installFromRegistry: (input: AcpRegistryInstallInput) => ipcRenderer.invoke('acpAgent:installFromRegistry', input),
    test: (id: string, cwd: string | null) => ipcRenderer.invoke('acpAgent:test', id, cwd),
};

export const acpAgentHttpApi: AcpAgentApi = {
    getAll: () => callRpc<AcpAgentView[]>('acpAgent', 'getAll', []),
    create: (input: AcpAgentCreateInput) => callRpc<AcpAgentView>('acpAgent', 'create', [input]),
    update: (id: string, input: AcpAgentUpdateInput) => callRpc<AcpAgentView>('acpAgent', 'update', [id, input]),
    delete: (id: string) => callRpc<void>('acpAgent', 'delete', [id]),
    enable: (id: string) => callRpc<AcpAgentView>('acpAgent', 'enable', [id]),
    disable: (id: string) => callRpc<AcpAgentView>('acpAgent', 'disable', [id]),
    getRegistry: () => callRpc<AcpRegistryView>('acpAgent', 'getRegistry', []),
    refreshRegistry: () => callRpc<AcpRegistryView>('acpAgent', 'refreshRegistry', []),
    installFromRegistry: (input: AcpRegistryInstallInput) => callRpc<AcpAgentView>('acpAgent', 'installFromRegistry', [input]),
    test: (id: string, cwd: string | null) => callRpc<AcpAgentTestResult>('acpAgent', 'test', [id, cwd]),
};
