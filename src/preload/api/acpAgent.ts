import { ipcRenderer } from 'electron';
import type { AcpAgentCreateInput, AcpAgentUpdateInput, AcpRegistryInstallInput } from '../../../packages/core/dto';
import type { AcpAgentApi } from '../contracts/acpAgent';

export const acpAgentApi: AcpAgentApi = {
    getAll: () => {
        return ipcRenderer.invoke('acpAgent:getAll');
    },
    create: (input: AcpAgentCreateInput) => {
        return ipcRenderer.invoke('acpAgent:create', input);
    },
    update: (id: string, input: AcpAgentUpdateInput) => {
        return ipcRenderer.invoke('acpAgent:update', id, input);
    },
    delete: (id: string) => {
        return ipcRenderer.invoke('acpAgent:delete', id);
    },
    enable: (id: string) => {
        return ipcRenderer.invoke('acpAgent:enable', id);
    },
    disable: (id: string) => {
        return ipcRenderer.invoke('acpAgent:disable', id);
    },
    getRegistry: () => {
        return ipcRenderer.invoke('acpAgent:getRegistry');
    },
    refreshRegistry: () => {
        return ipcRenderer.invoke('acpAgent:refreshRegistry');
    },
    installFromRegistry: (input: AcpRegistryInstallInput) => {
        return ipcRenderer.invoke('acpAgent:installFromRegistry', input);
    },
    test: (id: string, cwd: string | null) => {
        return ipcRenderer.invoke('acpAgent:test', id, cwd);
    },
};
