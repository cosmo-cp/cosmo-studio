import { AcpAgentInstallStatusEnum, AcpAgentSourceEnum } from 'core/database/schema/acpAgentSchema';
import type {
    AcpAgentCreateInput,
    AcpAgentTestResult,
    AcpAgentUpdateInput,
    AcpAgentView,
    AcpRegistryInstallInput,
    AcpRegistryView,
} from 'core/dto';
import { AcpAgentService } from 'core/services/AcpAgentService';
import { AcpRegistryService } from 'core/services/AcpRegistryService';
import { CORETYPES } from 'core/types/types';
import { inject, injectable } from 'inversify';
import { z } from 'zod';
import { IpcController, IpcHandler } from '../ipc/Decorators';
import { AcpAgentRuntimeService } from '../services/AcpAgentRuntimeService';
import { TYPES } from '../types';
import { Controller } from './Controller';

const acpAgentCreateSchema = z
    .object({
        name: z.string().min(1),
        description: z.string().optional().nullable(),
        source: z.nativeEnum(AcpAgentSourceEnum).default(AcpAgentSourceEnum.CUSTOM),
        registryId: z.string().optional().nullable(),
        version: z.string().optional().nullable(),
        command: z.string().min(1),
        args: z.array(z.string()).default([]),
        env: z.record(z.string(), z.string()).default({}),
        defaultCwd: z.string().optional().nullable(),
        authMethodId: z.string().optional().nullable(),
        enabled: z.boolean().default(true),
        installStatus: z.nativeEnum(AcpAgentInstallStatusEnum).default(AcpAgentInstallStatusEnum.INSTALLED),
        mcpServerIds: z.array(z.string()).default([]),
        metadata: z.record(z.string(), z.unknown()).default({}),
    })
    .strict();

const acpAgentUpdateSchema = acpAgentCreateSchema.partial();

const registryInstallSchema = z
    .object({
        registryId: z.string().min(1),
        defaultCwd: z.string().optional().nullable(),
        authMethodId: z.string().optional().nullable(),
        enabled: z.boolean().optional(),
        mcpServerIds: z.array(z.string()).optional(),
    })
    .strict();

@injectable()
@IpcController('acpAgent')
export class AcpAgentController implements Controller {
    constructor(
        @inject(CORETYPES.AcpAgentService)
        private readonly acpAgentService: AcpAgentService,
        @inject(CORETYPES.AcpRegistryService)
        private readonly acpRegistryService: AcpRegistryService,
        @inject(TYPES.AcpAgentRuntimeService)
        private readonly acpAgentRuntimeService: AcpAgentRuntimeService,
    ) {}

    @IpcHandler('getAll', z.tuple([]))
    public async getAll(): Promise<AcpAgentView[]> {
        return this.acpAgentService.getAll();
    }

    @IpcHandler('create', z.tuple([acpAgentCreateSchema]))
    public async create(input: AcpAgentCreateInput): Promise<AcpAgentView> {
        return this.acpAgentService.create(acpAgentCreateSchema.parse(input));
    }

    @IpcHandler('update', z.tuple([z.string().min(1), acpAgentUpdateSchema]))
    public async update(id: string, input: AcpAgentUpdateInput): Promise<AcpAgentView> {
        return this.acpAgentService.update(id, acpAgentUpdateSchema.parse(input));
    }

    @IpcHandler('delete', z.tuple([z.string().min(1)]))
    public async delete(id: string): Promise<void> {
        return this.acpAgentService.delete(id);
    }

    @IpcHandler('enable', z.tuple([z.string().min(1)]))
    public async enable(id: string): Promise<AcpAgentView> {
        return this.acpAgentService.enable(id);
    }

    @IpcHandler('disable', z.tuple([z.string().min(1)]))
    public async disable(id: string): Promise<AcpAgentView> {
        return this.acpAgentService.disable(id);
    }

    @IpcHandler('getRegistry', z.tuple([]))
    public async getRegistry(): Promise<AcpRegistryView> {
        return this.acpRegistryService.getCachedOrRefresh();
    }

    @IpcHandler('refreshRegistry', z.tuple([]))
    public async refreshRegistry(): Promise<AcpRegistryView> {
        return this.acpRegistryService.refresh();
    }

    @IpcHandler('installFromRegistry', z.tuple([registryInstallSchema]))
    public async installFromRegistry(input: AcpRegistryInstallInput): Promise<AcpAgentView> {
        return this.acpRegistryService.installFromRegistry(registryInstallSchema.parse(input));
    }

    @IpcHandler('test', z.tuple([z.string().min(1), z.string().nullable()]))
    public async test(id: string, cwd: string | null): Promise<AcpAgentTestResult> {
        return this.acpAgentRuntimeService.testAgent(id, cwd);
    }
}
