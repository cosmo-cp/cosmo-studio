import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { coreContainer } from '../inversify.config';
import { CORETYPES } from '../types/types';
import { SkillService } from './SkillService';

describe('SkillService', () => {
    let service: SkillService;
    let tempDir: string;

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-test-'));
        service = new SkillService([tempDir]);
    });

    afterEach(() => {
        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('parses valid SKILL.md with frontmatter and markdown body', () => {
        const skillFolder = path.join(tempDir, 'sample-skill');
        fs.mkdirSync(skillFolder, { recursive: true });

        const skillMd = `---
name: sample-skill
description: A helpful sample skill
license: MIT
disable-model-invocation: true
metadata:
    category: engineering
---
# Sample Skill Instructions
Follow these steps to complete the task.
`;
        fs.writeFileSync(path.join(skillFolder, 'SKILL.md'), skillMd);

        const manifest = service.parseSkillFile(path.join(skillFolder, 'SKILL.md'));
        expect(manifest).not.toBeNull();
        expect(manifest?.name).toBe('sample-skill');
        expect(manifest?.description).toBe('A helpful sample skill');
        expect(manifest?.license).toBe('MIT');
        expect(manifest?.disableModelInvocation).toBe(true);
        expect(manifest?.content).toContain('# Sample Skill Instructions');
        expect(manifest?.isBuiltIn).toBe(false);
    });

    it('identifies system skills as built-in', () => {
        const systemSkillFolder = path.join(tempDir, 'system', 'sys-skill');
        fs.mkdirSync(systemSkillFolder, { recursive: true });

        const skillMd = `---
name: sys-skill
description: A system skill
metadata:
    namespace: system
---
System instructions.
`;
        fs.writeFileSync(path.join(systemSkillFolder, 'SKILL.md'), skillMd);

        const manifest = service.parseSkillFile(path.join(systemSkillFolder, 'SKILL.md'));
        expect(manifest).not.toBeNull();
        expect(manifest?.name).toBe('sys-skill');
        expect(manifest?.isBuiltIn).toBe(true);
    });

    it('discovers all skills recursively in search directories', async () => {
        const skill1 = path.join(tempDir, 'skill-one');
        fs.mkdirSync(skill1, { recursive: true });
        fs.writeFileSync(
            path.join(skill1, 'SKILL.md'),
            `---
name: skill-one
description: Skill one
---
Content 1`,
        );

        const skill2 = path.join(tempDir, 'nested', 'skill-two');
        fs.mkdirSync(skill2, { recursive: true });
        fs.writeFileSync(
            path.join(skill2, 'SKILL.md'),
            `---
name: skill-two
description: Skill two
---
Content 2`,
        );

        const all = await service.getAllSkills();
        expect(all).toHaveLength(2);
        expect(
            all.map((s) => {
                return s.name;
            }),
        ).toEqual(['skill-one', 'skill-two']);

        const skillByName = await service.getSkillByName('skill-one');
        expect(skillByName?.name).toBe('skill-one');

        const content = await service.getSkillContent('skill-two');
        expect(content).toBe('Content 2');
    });

    it('discovers real repo skills including egm-bootstrap and run-workflow', async () => {
        const repoService = new SkillService();
        const skills = await repoService.getAllSkills();
        const skillNames = skills.map((s) => {
            return s.name;
        });

        expect(skillNames).toContain('egm-bootstrap');
        expect(skillNames).toContain('run-workflow');

        const egm = await repoService.getSkillByName('egm-bootstrap');
        expect(egm).toBeDefined();
        expect(egm?.description).toContain('Bootstrap directory README.md files');

        const workflow = await repoService.getSkillByName('run-workflow');
        expect(workflow).toBeDefined();
        expect(workflow?.isBuiltIn).toBe(true);
    });

    it('resolves from coreContainer without injection error', () => {
        const resolved = coreContainer.get(CORETYPES.SkillService);
        expect(resolved).toBeInstanceOf(SkillService);
    });
});
