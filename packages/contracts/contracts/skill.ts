import type { SkillManifest, SkillUploadInput } from 'core/dto';

export interface SkillApi {
    getAll(): Promise<SkillManifest[]>;
    getByName(name: string): Promise<SkillManifest | undefined>;
    getContent(name: string): Promise<string | undefined>;
    upload(input: SkillUploadInput): Promise<SkillManifest>;
    delete(name: string): Promise<boolean>;
}
