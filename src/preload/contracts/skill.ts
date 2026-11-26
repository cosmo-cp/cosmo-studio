import type { SkillManifest } from '../../../packages/core/dto';

export interface SkillApi {
    getAll(): Promise<SkillManifest[]>;
    getByName(name: string): Promise<SkillManifest | undefined>;
    getContent(name: string): Promise<string | undefined>;
}
