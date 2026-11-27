import type { Workspace, WorkspaceCreateInput, WorkspaceReachabilityResult, WorkspaceUpdateInput } from 'core/dto';
import type { FolderPickerService } from 'core/platform/FolderPickerService';
import { WorkspaceService } from 'core/services/WorkspaceService';
import { CORETYPES } from 'core/types/types';
import { inject, injectable } from 'inversify';
import { z } from 'zod';
import { IpcController, IpcHandler } from '../ipc/Decorators';
import { AcpAgentRuntimeService } from '../services/AcpAgentRuntimeService';
import { WorkspaceExecutionLockService } from '../services/WorkspaceExecutionLockService';
import { TYPES } from '../types';
import { Controller } from './Controller';

const workspaceCreateSchema = z.object({
    name: z.string().optional(),
    path: z.string().min(1),
});

const workspaceUpdateSchema = z.object({
    name: z.string().min(1).optional(),
    path: z.string().min(1).optional(),
});

@injectable()
@IpcController('workspace')
export class WorkspaceController implements Controller {
    constructor(
        @inject(CORETYPES.WorkspaceService)
        private readonly workspaceService: WorkspaceService,
        @inject(CORETYPES.FolderPickerService)
        private readonly folderPickerService: FolderPickerService,
        @inject(TYPES.WorkspaceExecutionLockService)
        private readonly workspaceLockService: WorkspaceExecutionLockService,
        @inject(TYPES.AcpAgentRuntimeService)
        private readonly acpAgentRuntimeService: AcpAgentRuntimeService,
    ) {}

    @IpcHandler('list', z.tuple([]))
    public async list(): Promise<Workspace[]> {
        return this.workspaceService.list();
    }

    @IpcHandler('get', z.tuple([z.string().uuid()]))
    public async get(id: string): Promise<Workspace | undefined> {
        return this.workspaceService.get(id);
    }

    @IpcHandler('create', z.tuple([workspaceCreateSchema]))
    public async create(input: WorkspaceCreateInput): Promise<Workspace> {
        return this.workspaceService.create(input);
    }

    @IpcHandler('update', z.tuple([z.string().uuid(), workspaceUpdateSchema]))
    public async update(id: string, input: WorkspaceUpdateInput): Promise<Workspace> {
        const ws = await this.workspaceService.get(id);
        if (!ws) {
            throw new Error(`Workspace not found: ${id}`);
        }
        if (input.path && this.workspaceLockService.isWorkspaceBusy(ws.canonicalPath)) {
            throw new Error(`Cannot relocate workspace "${ws.name}": it is currently in use.`);
        }
        const updated = await this.workspaceService.update(id, input);
        if (input.path) {
            this.acpAgentRuntimeService.evictWorkspace(ws.canonicalPath);
        }
        return updated;
    }

    @IpcHandler('delete', z.tuple([z.string().uuid()]))
    public async delete(id: string): Promise<boolean> {
        const ws = await this.workspaceService.get(id);
        if (!ws) {
            return false;
        }
        if (this.workspaceLockService.isWorkspaceBusy(ws.canonicalPath)) {
            throw new Error(`Cannot delete workspace "${ws.name}": it is currently in use.`);
        }
        this.acpAgentRuntimeService.evictWorkspace(ws.canonicalPath);
        return this.workspaceService.delete(id);
    }

    @IpcHandler('pickFolder', z.tuple([]))
    public async pickFolder(): Promise<string | null> {
        return this.folderPickerService.pickDirectory();
    }

    @IpcHandler('checkReachability', z.tuple([z.string().uuid()]))
    public async checkReachability(id: string): Promise<WorkspaceReachabilityResult> {
        return this.workspaceService.validateReachability(id);
    }

    @IpcHandler('checkAllReachability', z.tuple([]))
    public async checkAllReachability(): Promise<Record<string, WorkspaceReachabilityResult>> {
        const workspaces = await this.workspaceService.list();
        const results: Record<string, WorkspaceReachabilityResult> = {};
        await Promise.all(
            workspaces.map(async (ws) => {
                results[ws.id] = await this.workspaceService.validateReachability(ws.id);
            }),
        );
        return results;
    }
}
