import type { SkillManifest } from 'core/dto';
import { SkillService } from 'core/services/SkillService';
import { CORETYPES } from 'core/types/types';
import { inject, injectable } from 'inversify';
import { z } from 'zod';
import { IpcController, IpcHandler } from '../ipc/Decorators';
import { Controller } from './Controller';

@injectable()
@IpcController('skill')
export class SkillController implements Controller {
    constructor(@inject(CORETYPES.SkillService) private skillService: SkillService) {}

    @IpcHandler('getAll', z.tuple([]))
    public async getAll(): Promise<SkillManifest[]> {
        return this.skillService.getAllSkills();
    }

    @IpcHandler('getByName', z.tuple([z.string().min(1)]))
    public async getByName(name: string): Promise<SkillManifest | undefined> {
        return this.skillService.getSkillByName(name);
    }

    @IpcHandler('getContent', z.tuple([z.string().min(1)]))
    public async getContent(name: string): Promise<string | undefined> {
        return this.skillService.getSkillContent(name);
    }
}
