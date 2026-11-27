import type { SkillManifest, SkillUploadInput } from '../../../packages/core/dto';
import { callRpc } from '../api/common';
import type { SkillApi } from '../contracts/skill';

export const skillHttpApi: SkillApi = {
    getAll: () => {
        return callRpc<SkillManifest[]>('skill', 'getAll', []);
    },
    getByName: (name: string) => {
        return callRpc<SkillManifest | undefined>('skill', 'getByName', [name]);
    },
    getContent: (name: string) => {
        return callRpc<string | undefined>('skill', 'getContent', [name]);
    },
    upload: (input: SkillUploadInput) => {
        return callRpc<SkillManifest>('skill', 'upload', [input]);
    },
    delete: (name: string) => {
        return callRpc<boolean>('skill', 'delete', [name]);
    },
};
