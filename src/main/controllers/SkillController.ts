import type { SkillManifest, SkillUploadInput } from 'core/dto';
import { SkillService } from 'core/services/SkillService';
import { CORETYPES } from 'core/types/types';
import { inject, injectable } from 'inversify';
import { z } from 'zod';
import { IpcController, IpcHandler } from '../ipc/Decorators';
import { Controller } from './Controller';

const skillUploadSchema = z
    .object({
        name: z.string().optional(),
        content: z.string().optional(),
        archiveBase64: z.string().optional(),
    })
    .refine(
        (data) => {
            return Boolean(data.content || data.archiveBase64);
        },
        {
            message: 'Either content or archiveBase64 must be provided',
        },
    );

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

    @IpcHandler('upload', z.tuple([skillUploadSchema]))
    public async upload(input: SkillUploadInput): Promise<SkillManifest> {
        return this.skillService.uploadSkill(input);
    }

    @IpcHandler('delete', z.tuple([z.string().min(1)]))
    public async delete(name: string): Promise<boolean> {
        return this.skillService.deleteSkill(name);
    }
}
