import type {
    AcpAgentCreateInput,
    AcpAgentTestResult,
    AcpAgentUpdateInput,
    AcpAgentView,
    AcpRegistryInstallInput,
    AcpRegistryView,
} from '../../../packages/core/dto';
import { callRpc } from '../api/common';
import type { AcpAgentApi } from '../contracts/acpAgent';

export const acpAgentHttpApi: AcpAgentApi = {
    getAll: () => {
        return callRpc<AcpAgentView[]>('acpAgent', 'getAll', []);
    },
    create: (input: AcpAgentCreateInput) => {
        return callRpc<AcpAgentView>('acpAgent', 'create', [input]);
    },
    update: (id: string, input: AcpAgentUpdateInput) => {
        return callRpc<AcpAgentView>('acpAgent', 'update', [id, input]);
    },
    delete: (id: string) => {
        return callRpc<void>('acpAgent', 'delete', [id]);
    },
    enable: (id: string) => {
        return callRpc<AcpAgentView>('acpAgent', 'enable', [id]);
    },
    disable: (id: string) => {
        return callRpc<AcpAgentView>('acpAgent', 'disable', [id]);
    },
    getRegistry: () => {
        return callRpc<AcpRegistryView>('acpAgent', 'getRegistry', []);
    },
    refreshRegistry: () => {
        return callRpc<AcpRegistryView>('acpAgent', 'refreshRegistry', []);
    },
    installFromRegistry: (input: AcpRegistryInstallInput) => {
        return callRpc<AcpAgentView>('acpAgent', 'installFromRegistry', [input]);
    },
    test: (id: string, cwd: string | null) => {
        return callRpc<AcpAgentTestResult>('acpAgent', 'test', [id, cwd]);
    },
};
