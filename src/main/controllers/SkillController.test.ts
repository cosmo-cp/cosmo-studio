import type { SkillManifest } from 'core/dto';
import type { SkillService } from 'core/services/SkillService';
import { describe, expect, it, vi } from 'vitest';
import { SkillController } from './SkillController';

describe('SkillController', () => {
    it('delegates skill queries to SkillService', async () => {
        const skills: SkillManifest[] = [
            {
                name: 'egm-bootstrap',
                description: 'Bootstrap EGM docs',
                path: '/skills/egm-bootstrap',
                isBuiltIn: false,
            },
        ];

        const service: SkillService = {
            getAllSkills: vi.fn().mockResolvedValue(skills),
            getSkillByName: vi.fn().mockResolvedValue(skills[0]),
            getSkillContent: vi.fn().mockResolvedValue('Skill instructions content'),
        } as unknown as SkillService;

        const controller = new SkillController(service);

        await expect(controller.getAll()).resolves.toEqual(skills);
        expect(service.getAllSkills).toHaveBeenCalledTimes(1);

        await expect(controller.getByName('egm-bootstrap')).resolves.toEqual(skills[0]);
        expect(service.getSkillByName).toHaveBeenCalledWith('egm-bootstrap');

        await expect(controller.getContent('egm-bootstrap')).resolves.toBe('Skill instructions content');
        expect(service.getSkillContent).toHaveBeenCalledWith('egm-bootstrap');
    });
});
